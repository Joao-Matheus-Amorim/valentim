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

const whatsappRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/webhooks/whatsapp', async (request, reply) => {
    const incoming = request.headers['x-webhook-secret'];
    if (incoming !== env.WEBHOOK_SECRET) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const payload = parseBody(webhookMessageBodySchema, request.body, reply);
    if (!payload) return;

    const office = await prisma.office.findFirst();
    if (!office) {
      return reply.code(500).send({ error: 'Office not configured' });
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

    if (payload.messageType === 'DOCUMENT' && payload.fileName) {
      const metaMediaId = payload.mediaId ?? payload.metaMediaId ?? payload.mediaUrl;

      if (!metaMediaId) {
        return reply.code(400).send({ error: 'Document media id is required' });
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

      return { received: true, queued: true, jobId: job.id, documentFileId: fileRecord.id };
    }

    return { received: true, queued: false };
  });
};

export default whatsappRoutes;
