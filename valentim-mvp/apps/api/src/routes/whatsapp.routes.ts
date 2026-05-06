import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { PassThrough } from 'stream';
import { prisma } from '../lib/prisma';
import { analyzeDocument } from '../lib/ai-mock';
import { mediaDownloadQueue } from '../lib/queue';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RawBodyRequest = {
  rawBody?: Buffer;
};

type InternalMessageType = 'TEXT' | 'DOCUMENT' | 'IMAGE' | 'OTHER';

type InboundWhatsAppMessage = {
  provider: 'META' | 'EVOLUTION';
  providerMessageId: string;
  providerAccountId: string;
  from: string;
  type: InternalMessageType;
  body: string | null;
  mediaId: string | null;
  mediaUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  canDownloadWithMetaWorker: boolean;
};

function verifyHmac(rawBody: Buffer, signature: string, appSecret: string): boolean {
  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function clonePayloadWithRawBody(request: unknown, payload: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of payload) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks);
  (request as RawBodyRequest).rawBody = rawBody;

  const replay = new PassThrough();
  replay.end(rawBody);

  return replay;
}

function normalizePhone(phone: string) {
  const clean = phone.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
  return clean.startsWith('+') ? clean : `+${clean}`;
}

// ---------------------------------------------------------------------------
// Meta Cloud API
// ---------------------------------------------------------------------------

interface MetaMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'document' | 'image' | 'audio' | 'video' | 'sticker' | 'unknown';
  text?: { body: string };
  document?: { id: string; filename: string; mime_type: string; sha256?: string };
  image?: { id: string; mime_type: string; sha256?: string };
  audio?: { id: string; mime_type: string };
  video?: { id: string; mime_type: string; sha256?: string };
  sticker?: { id: string; mime_type: string; sha256?: string };
}

interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        messages?: MetaMessage[];
        statuses?: unknown[];
      };
      field: string;
    }>;
  }>;
}

function mapMetaMessageType(metaType: MetaMessage['type']): InternalMessageType {
  const map: Record<string, InternalMessageType> = {
    text: 'TEXT',
    document: 'DOCUMENT',
    image: 'IMAGE',
    audio: 'OTHER',
    video: 'OTHER',
    sticker: 'OTHER',
    unknown: 'OTHER'
  };

  return map[metaType] ?? 'OTHER';
}

function metaToInbound(msg: MetaMessage, wabaId: string): InboundWhatsAppMessage {
  const media = getMetaMediaInfo(msg);

  return {
    provider: 'META',
    providerAccountId: wabaId,
    providerMessageId: msg.id,
    from: msg.from,
    type: mapMetaMessageType(msg.type),
    body: msg.text?.body ?? null,
    mediaId: media.mediaId,
    mediaUrl: media.mediaUrl,
    fileName: media.fileName,
    mimeType: media.mimeType,
    canDownloadWithMetaWorker: Boolean(media.mediaId)
  };
}

function getMetaMediaInfo(msg: MetaMessage) {
  if (msg.document) {
    return {
      mediaId: msg.document.id,
      mediaUrl: `meta://media/${msg.document.id}`,
      fileName: msg.document.filename,
      mimeType: msg.document.mime_type
    };
  }

  if (msg.image) {
    return {
      mediaId: msg.image.id,
      mediaUrl: `meta://media/${msg.image.id}`,
      fileName: null,
      mimeType: msg.image.mime_type
    };
  }

  if (msg.audio) {
    return {
      mediaId: msg.audio.id,
      mediaUrl: `meta://media/${msg.audio.id}`,
      fileName: null,
      mimeType: msg.audio.mime_type
    };
  }

  if (msg.video) {
    return {
      mediaId: msg.video.id,
      mediaUrl: `meta://media/${msg.video.id}`,
      fileName: null,
      mimeType: msg.video.mime_type
    };
  }

  if (msg.sticker) {
    return {
      mediaId: msg.sticker.id,
      mediaUrl: `meta://media/${msg.sticker.id}`,
      fileName: null,
      mimeType: msg.sticker.mime_type
    };
  }

  return { mediaId: null, mediaUrl: null, fileName: null, mimeType: null };
}

// ---------------------------------------------------------------------------
// Evolution API
// ---------------------------------------------------------------------------

type EvolutionWebhookPayload = {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      id?: string;
      remoteJid?: string;
      fromMe?: boolean;
    };
    pushName?: string;
    messageType?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      documentMessage?: {
        url?: string;
        mimetype?: string;
        fileName?: string;
        mediaKey?: string;
        directPath?: string;
      };
      imageMessage?: {
        url?: string;
        mimetype?: string;
        mediaKey?: string;
        directPath?: string;
      };
      audioMessage?: {
        url?: string;
        mimetype?: string;
        mediaKey?: string;
        directPath?: string;
      };
      videoMessage?: {
        url?: string;
        mimetype?: string;
        mediaKey?: string;
        directPath?: string;
      };
    };
  };
};

function isEvolutionPayload(payload: unknown): payload is EvolutionWebhookPayload {
  const body = payload as EvolutionWebhookPayload;
  return body?.event === 'messages.upsert' || body?.event === 'MESSAGES_UPSERT';
}

function evolutionToInbound(payload: EvolutionWebhookPayload): InboundWhatsAppMessage | null {
  const data = payload.data;
  const key = data?.key;
  const message = data?.message;

  if (!data || !key?.id || !key.remoteJid || !message) return null;
  if (key.fromMe) return null;

  const documentMessage = message.documentMessage;
  const imageMessage = message.imageMessage;
  const audioMessage = message.audioMessage;
  const videoMessage = message.videoMessage;

  const body = message.conversation ?? message.extendedTextMessage?.text ?? null;

  let type: InternalMessageType = 'TEXT';
  let mediaUrl: string | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;

  if (documentMessage) {
    type = 'DOCUMENT';
    mediaUrl = documentMessage.url ?? documentMessage.directPath ?? `evolution://message/${key.id}`;
    fileName = documentMessage.fileName ?? `documento-${key.id}.pdf`;
    mimeType = documentMessage.mimetype ?? 'application/pdf';
  } else if (imageMessage) {
    type = 'IMAGE';
    mediaUrl = imageMessage.url ?? imageMessage.directPath ?? `evolution://message/${key.id}`;
    mimeType = imageMessage.mimetype ?? 'image/jpeg';
  } else if (audioMessage) {
    type = 'OTHER';
    mediaUrl = audioMessage.url ?? audioMessage.directPath ?? `evolution://message/${key.id}`;
    mimeType = audioMessage.mimetype ?? 'audio/ogg';
  } else if (videoMessage) {
    type = 'OTHER';
    mediaUrl = videoMessage.url ?? videoMessage.directPath ?? `evolution://message/${key.id}`;
    mimeType = videoMessage.mimetype ?? 'video/mp4';
  } else if (!body) {
    type = 'OTHER';
  }

  return {
    provider: 'EVOLUTION',
    providerAccountId: payload.instance ?? process.env.EVOLUTION_INSTANCE ?? 'evolution',
    providerMessageId: key.id,
    from: key.remoteJid,
    type,
    body,
    mediaId: key.id,
    mediaUrl,
    fileName,
    mimeType,
    canDownloadWithMetaWorker: false
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

const whatsappRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preParsing', async (request, _reply, payload) => {
    if (request.method !== 'POST' || request.url.split('?')[0] !== '/api/webhooks/whatsapp') {
      return payload;
    }

    return clonePayloadWithRawBody(request, payload);
  });

  // Verificação Meta. Evolution não usa este GET.
  app.get('/api/webhooks/whatsapp', async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!verifyToken) {
      app.log.error('WHATSAPP_VERIFY_TOKEN não configurado');
      return reply.code(500).send({ error: 'Server misconfigured' });
    }

    if (mode === 'subscribe' && token === verifyToken && challenge) {
      app.log.info('Webhook WhatsApp verificado com sucesso');
      return reply.code(200).type('text/plain').send(challenge);
    }

    return reply.code(403).send({ error: 'Forbidden' });
  });

  app.post('/api/webhooks/whatsapp', async (request, reply) => {
    const payload = request.body as MetaWebhookPayload | EvolutionWebhookPayload;

    if (isEvolutionPayload(payload)) {
      const inbound = evolutionToInbound(payload);

      if (inbound) {
        await handleInboundMessage(app, inbound).catch((err) => {
          app.log.error({ err, msgId: inbound.providerMessageId }, 'Erro ao processar mensagem Evolution');
        });
      }

      return reply.code(200).send({ received: true, provider: 'EVOLUTION' });
    }

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const signatureHeader = (request.headers['x-hub-signature-256'] as string | undefined) ?? '';

    if (!appSecret) {
      app.log.error('WHATSAPP_APP_SECRET não configurado');
      return reply.code(500).send({ error: 'Server misconfigured' });
    }

    const rawBody = (request as RawBodyRequest).rawBody;

    if (!rawBody || !verifyHmac(rawBody, signatureHeader, appSecret)) {
      app.log.warn('Assinatura HMAC inválida — request rejeitado');
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    if ((payload as MetaWebhookPayload).object !== 'whatsapp_business_account') {
      return reply.code(200).send({ received: true, provider: 'META' });
    }

    for (const entry of (payload as MetaWebhookPayload).entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        for (const msg of change.value.messages ?? []) {
          const inbound = metaToInbound(msg, entry.id);
          await handleInboundMessage(app, inbound).catch((err) => {
            app.log.error({ err, msgId: inbound.providerMessageId }, 'Erro ao processar mensagem Meta');
          });
        }
      }
    }

    return reply.code(200).send({ received: true, provider: 'META' });
  });
};

// ---------------------------------------------------------------------------
// Lógica de processamento comum
// ---------------------------------------------------------------------------

async function handleInboundMessage(app: Parameters<FastifyPluginAsync>[0], inbound: InboundWhatsAppMessage) {
  const alreadyProcessed = await prisma.whatsAppMessage.findFirst({
    where: { providerMessageId: inbound.providerMessageId }
  });

  if (alreadyProcessed) return;

  const office = await prisma.office.findFirst();
  if (!office) return;

  const phone = normalizePhone(inbound.from);

  const client = await prisma.client.findFirst({
    where: { phone, officeId: office.id }
  });

  await prisma.whatsAppMessage.create({
    data: {
      officeId: office.id,
      clientId: client?.id ?? null,
      providerMessageId: inbound.providerMessageId,
      phone,
      direction: 'INCOMING',
      messageType: inbound.type,
      body: inbound.body,
      mediaUrl: inbound.mediaUrl,
      mediaKey: inbound.mediaId ? `pending://${inbound.provider.toLowerCase()}/${inbound.mediaId}` : null,
      processed: false
    }
  });

  if (client) {
    const conversation = await prisma.conversationState.findFirst({
      where: { clientId: client.id, phone }
    });

    if (conversation) {
      await prisma.conversationState.update({
        where: { id: conversation.id },
        data: {
          status: inbound.type === 'DOCUMENT' ? 'PROCESSING' : 'IDLE',
          lastMessageAt: new Date()
        }
      });
    } else {
      await prisma.conversationState.create({
        data: {
          clientId: client.id,
          phone,
          status: inbound.type === 'DOCUMENT' ? 'PROCESSING' : 'IDLE',
          pendingRequests: [],
          lastMessageAt: new Date()
        }
      });
    }
  }

  if (inbound.type !== 'DOCUMENT' || !inbound.mediaId || !inbound.fileName || !inbound.mimeType) return;

  const ai = analyzeDocument(inbound.fileName, inbound.mimeType);

  const docRequest = client
    ? await prisma.documentRequest.findFirst({
        where: {
          company: { clientId: client.id },
          documentType: ai.documentType,
          status: 'PENDING'
        },
        select: { id: true, companyId: true, dueDate: true },
        orderBy: { createdAt: 'asc' }
      })
    : null;

  const storageKey = inbound.canDownloadWithMetaWorker
    ? `pending://meta/${inbound.mediaId}`
    : inbound.mediaUrl ?? `pending://evolution/${inbound.mediaId}`;

  const fileRecord = await prisma.documentFile.create({
    data: {
      documentRequestId: docRequest?.id ?? null,
      filename: inbound.fileName,
      mimeType: inbound.mimeType,
      storageKey
    }
  });

  await prisma.aIAnalysis.create({
    data: {
      documentFileId: fileRecord.id,
      documentRequestId: docRequest?.id ?? null,
      documentType: ai.documentType,
      competence: ai.competence,
      cnpj: ai.cnpj,
      totalValue: ai.totalValue ?? null,
      confidence: ai.confidence,
      summary: ai.summary,
      flags: ai.flags,
      model: ai.model
    }
  });

  if (docRequest) {
    await prisma.documentRequest.update({
      where: { id: docRequest.id },
      data: { status: 'SENT' }
    });

    await prisma.task.create({
      data: {
        officeId: office.id,
        clientId: client?.id ?? null,
        companyId: docRequest.companyId,
        documentRequestId: docRequest.id,
        title: `Revisar documento recebido: ${inbound.fileName}`,
        description: `Documento recebido pelo WhatsApp (${inbound.providerAccountId}) via ${inbound.provider} e classificado pelo mock de IA como ${ai.documentType}.`,
        status: 'WAITING_REVIEW',
        priority: ai.confidence < 0.75 ? 'HIGH' : 'MEDIUM',
        source: 'whatsapp',
        dueDate: docRequest.dueDate
      }
    });
  } else {
    await prisma.unmatchedDocument.create({
      data: {
        documentRequestId: null,
        clientId: client?.id ?? null,
        phone,
        storageKey,
        aiAnalysis: {
          documentType: ai.documentType,
          competence: ai.competence,
          cnpj: ai.cnpj,
          totalValue: ai.totalValue ?? null,
          confidence: ai.confidence,
          summary: ai.summary,
          flags: ai.flags,
          model: ai.model
        },
        triaged: false
      }
    });

    await prisma.task.create({
      data: {
        officeId: office.id,
        clientId: client?.id ?? null,
        title: `Triar documento sem solicitação: ${inbound.fileName}`,
        description: `Documento chegou pelo WhatsApp via ${inbound.provider}, mas não foi vinculado automaticamente a uma solicitação pendente.`,
        status: 'WAITING_REVIEW',
        priority: 'HIGH',
        source: 'whatsapp'
      }
    });
  }

  if (inbound.canDownloadWithMetaWorker) {
    await mediaDownloadQueue.add(
      'download-media',
      { documentFileId: fileRecord.id, metaMediaId: inbound.mediaId, filename: inbound.fileName, mimeType: inbound.mimeType },
      { jobId: `media-${inbound.mediaId}` }
    );

    app.log.info({ fileId: fileRecord.id, mediaId: inbound.mediaId }, 'Job de download de mídia Meta enfileirado');
  } else {
    app.log.info({ fileId: fileRecord.id, provider: inbound.provider }, 'Documento recebido via Evolution salvo sem worker Meta');
  }
}

export default whatsappRoutes;
