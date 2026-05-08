import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { mediaDownloadQueue } from '../lib/queue';
import { nonEmptyString, optionalNullableString, parseBody } from '../lib/validation';

const webhookMessageBodySchema = z.object({
  providerMessageId: optionalNullableString,
  phone: nonEmptyString,
  messageType: z.enum(['TEXT', 'DOCUMENT', 'IMAGE', 'OTHER']).optional(),
  body: optionalNullableString,
  mediaUrl: optionalNullableString,
  fileName: optionalNullableString,
  mimeType: optionalNullableString,
  mediaId: optionalNullableString,
  metaMediaId: optionalNullableString
});

type NormalizedWebhookMessage = z.infer<typeof webhookMessageBodySchema>;

function getVerifyToken() {
  return process.env.WEBHOOK_VERIFY_TOKEN?.trim() || env.WEBHOOK_SECRET;
}

function getQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function isMetaWebhookPayload(body: unknown): body is { entry?: unknown[] } {
  return typeof body === 'object' && body !== null && 'entry' in body;
}

function normalizeMetaMessage(message: any): NormalizedWebhookMessage | null {
  const type = typeof message?.type === 'string' ? message.type : 'OTHER';
  const phone = typeof message?.from === 'string' ? message.from : '';
  const providerMessageId = typeof message?.id === 'string' ? message.id : null;

  if (!phone) return null;

  if (type === 'document') {
    return {
      providerMessageId,
      phone,
      messageType: 'DOCUMENT',
      body: message.document?.caption ?? null,
      mediaUrl: null,
      fileName: message.document?.filename ?? `document-${providerMessageId ?? Date.now()}`,
      mimeType: message.document?.mime_type ?? 'application/octet-stream',
      mediaId: message.document?.id ?? null,
      metaMediaId: message.document?.id ?? null
    };
  }

  if (type === 'image') {
    return {
      providerMessageId,
      phone,
      messageType: 'IMAGE',
      body: message.image?.caption ?? null,
      mediaUrl: null,
      fileName: `image-${providerMessageId ?? Date.now()}.jpg`,
      mimeType: message.image?.mime_type ?? 'image/jpeg',
      mediaId: message.image?.id ?? null,
      metaMediaId: message.image?.id ?? null
    };
  }

  if (type === 'text') {
    return {
      providerMessageId,
      phone,
      messageType: 'TEXT',
      body: message.text?.body ?? null,
      mediaUrl: null,
      fileName: null,
      mimeType: null,
      mediaId: null,
      metaMediaId: null
    };
  }

  return {
    providerMessageId,
    phone,
    messageType: 'OTHER',
    body: null,
    mediaUrl: null,
    fileName: null,
    mimeType: null,
    mediaId: null,
    metaMediaId: null
  };
}

function normalizeMetaWebhookPayload(body: unknown): NormalizedWebhookMessage[] {
  if (!isMetaWebhookPayload(body)) return [];

  const messages: NormalizedWebhookMessage[] = [];

  for (const entry of body.entry ?? []) {
    const changes = (entry as any)?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = change?.value;
      if (!Array.isArray(value?.messages)) continue;

      for (const message of value.messages) {
        const normalized = normalizeMetaMessage(message);
        if (normalized) messages.push(normalized);
      }
    }
  }

  return messages;
}

async function processNormalizedMessage(payload: NormalizedWebhookMessage) {
  const office = await prisma.office.findFirst();
  if (!office) {
    throw new Error('Office not configured');
  }

  const client = await prisma.client.findFirst({
    where: { phone: payload.phone, officeId: office.id }
  });

  await prisma.whatsAppMessage.create({
    data: {
      officeId: office.id,
      clientId: client?.id ?? null,
      providerMessageId: payload.providerMessageId || '',
      phone: payload.phone,
      direction: 'INCOMING',
      messageType: payload.messageType || 'TEXT',
      body: payload.body ?? null,
      mediaUrl: payload.mediaUrl ?? null,
      mediaKey: payload.mediaId ?? payload.metaMediaId ?? null
    }
  });

  if (payload.messageType !== 'DOCUMENT' || !payload.fileName) {
    return { queued: false as const };
  }

  const metaMediaId = payload.mediaId ?? payload.metaMediaId ?? payload.mediaUrl;

  if (!metaMediaId) {
    return { queued: false as const, error: 'Document media id is required' };
  }

  const fileRecord = await prisma.documentFile.create({
    data: {
      documentRequestId: null,
      filename: payload.fileName,
      mimeType: payload.mimeType ?? 'application/octet-stream',
      storageKey: payload.mediaUrl || ''
    }
  });

  const job = await mediaDownloadQueue.add(
    'download-and-analyze-document',
    {
      documentFileId: fileRecord.id,
      metaMediaId,
      filename: payload.fileName,
      mimeType: payload.mimeType ?? 'application/octet-stream',
      clientId: client?.id ?? null,
      officeId: office.id
    },
    {
      jobId: payload.providerMessageId ? `whatsapp:${payload.providerMessageId}` : undefined
    }
  );

  return { queued: true as const, jobId: job.id, documentFileId: fileRecord.id };
}

const whatsappRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/webhooks/whatsapp', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const mode = getQueryValue(query['hub.mode']);
    const token = getQueryValue(query['hub.verify_token']);
    const challenge = getQueryValue(query['hub.challenge']);

    if (mode === 'subscribe' && token === getVerifyToken() && typeof challenge === 'string') {
      return reply.type('text/plain').send(challenge);
    }

    return reply.code(403).send({ error: 'Webhook verification failed' });
  });

  app.post('/api/webhooks/whatsapp', async (request, reply) => {
    const incoming = request.headers['x-webhook-secret'];
    const normalizedMessages = normalizeMetaWebhookPayload(request.body);
    const isMetaPayload = normalizedMessages.length > 0;

    if (!isMetaPayload && incoming !== env.WEBHOOK_SECRET) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (isMetaPayload) {
      const results = [];
      for (const message of normalizedMessages) {
        results.push(await processNormalizedMessage(message));
      }

      return { received: true, provider: 'meta', processed: results.length, results };
    }

    const payload = parseBody(webhookMessageBodySchema, request.body, reply);
    if (!payload) return;

    const result = await processNormalizedMessage(payload);

    if ('error' in result) {
      return reply.code(400).send({ error: result.error });
    }

    return { received: true, provider: 'manual', ...result };
  });
};

export default whatsappRoutes;
