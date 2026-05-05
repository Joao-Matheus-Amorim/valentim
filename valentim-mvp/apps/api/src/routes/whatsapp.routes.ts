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

// Formato real da Meta Cloud API → campos internos do Valentim
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

type InternalMessageType = 'TEXT' | 'DOCUMENT' | 'IMAGE' | 'OTHER';

function mapMessageType(metaType: MetaMessage['type']): InternalMessageType {
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

function normalizePhone(phone: string) {
  return phone.startsWith('+') ? phone : `+${phone}`;
}

function getMediaInfo(msg: MetaMessage) {
  if (msg.document) {
    return {
      metaMediaId: msg.document.id,
      mediaUrl: `meta://media/${msg.document.id}`,
      fileName: msg.document.filename,
      mimeType: msg.document.mime_type
    };
  }

  if (msg.image) {
    return {
      metaMediaId: msg.image.id,
      mediaUrl: `meta://media/${msg.image.id}`,
      fileName: null,
      mimeType: msg.image.mime_type
    };
  }

  if (msg.audio) {
    return {
      metaMediaId: msg.audio.id,
      mediaUrl: `meta://media/${msg.audio.id}`,
      fileName: null,
      mimeType: msg.audio.mime_type
    };
  }

  if (msg.video) {
    return {
      metaMediaId: msg.video.id,
      mediaUrl: `meta://media/${msg.video.id}`,
      fileName: null,
      mimeType: msg.video.mime_type
    };
  }

  if (msg.sticker) {
    return {
      metaMediaId: msg.sticker.id,
      mediaUrl: `meta://media/${msg.sticker.id}`,
      fileName: null,
      mimeType: msg.sticker.mime_type
    };
  }

  return { metaMediaId: null, mediaUrl: null, fileName: null, mimeType: null };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

const whatsappRoutes: FastifyPluginAsync = async (app) => {
  // Fastify precisa do corpo cru para validar X-Hub-Signature-256.
  // Este hook fica escopado a este plugin e repõe o stream para o parser JSON normal.
  app.addHook('preParsing', async (request, _reply, payload) => {
    if (request.method !== 'POST' || request.url.split('?')[0] !== '/api/webhooks/whatsapp') {
      return payload;
    }

    return clonePayloadWithRawBody(request, payload);
  });

  // 1. Verificação de webhook (Meta exige isso ao cadastrar a URL)
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

  // 2. Receber mensagens reais da Meta
  app.post('/api/webhooks/whatsapp', async (request, reply) => {
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

    const payload = request.body as MetaWebhookPayload;

    if (payload.object !== 'whatsapp_business_account') {
      return reply.code(200).send({ received: true });
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        for (const msg of change.value.messages ?? []) {
          await handleMessage(app, msg, entry.id).catch((err) => {
            app.log.error({ err, msgId: msg.id }, 'Erro ao processar mensagem WhatsApp');
          });
        }
      }
    }

    // A Meta espera 200 para não reenfileirar o evento.
    return reply.code(200).send({ received: true });
  });
};

// ---------------------------------------------------------------------------
// Lógica de processamento de cada mensagem
// ---------------------------------------------------------------------------

async function handleMessage(app: Parameters<FastifyPluginAsync>[0], msg: MetaMessage, wabaId: string) {
  // Evita duplicar mensagens caso a Meta tente reenviar o mesmo evento.
  const alreadyProcessed = await prisma.whatsAppMessage.findFirst({
    where: { providerMessageId: msg.id }
  });

  if (alreadyProcessed) return;

  // Setup atual ainda não tem whatsappAccountId no Office.
  // Quando o schema ganhar esse campo, este fallback deve virar busca por WABA ID.
  const office = await prisma.office.findFirst();

  if (!office) return;

  const phone = normalizePhone(msg.from);

  const client = await prisma.client.findFirst({
    where: { phone, officeId: office.id }
  });

  const messageType = mapMessageType(msg.type);
  const body = msg.text?.body ?? null;
  const { metaMediaId, mediaUrl, fileName, mimeType } = getMediaInfo(msg);

  await prisma.whatsAppMessage.create({
    data: {
      officeId: office.id,
      clientId: client?.id ?? null,
      providerMessageId: msg.id,
      phone,
      direction: 'INCOMING',
      messageType,
      body,
      mediaUrl,
      mediaKey: metaMediaId ? `pending://meta/${metaMediaId}` : null,
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
          status: messageType === 'DOCUMENT' ? 'PROCESSING' : 'IDLE',
          lastMessageAt: new Date()
        }
      });
    } else {
      await prisma.conversationState.create({
        data: {
          clientId: client.id,
          phone,
          status: messageType === 'DOCUMENT' ? 'PROCESSING' : 'IDLE',
          pendingRequests: [],
          lastMessageAt: new Date()
        }
      });
    }
  }

  // Só documentos entram no fluxo atual de análise de IA mockada.
  if (messageType !== 'DOCUMENT' || !metaMediaId || !fileName || !mimeType) return;

  const ai = analyzeDocument(fileName, mimeType);

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

  const fileRecord = await prisma.documentFile.create({
    data: {
      documentRequestId: docRequest?.id ?? null,
      filename: fileName,
      mimeType,
      storageKey: `pending://meta/${metaMediaId}`
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
        title: `Revisar documento recebido: ${fileName}`,
        description: `Documento recebido pelo WhatsApp (${wabaId}) e classificado pelo mock de IA como ${ai.documentType}.`,
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
        storageKey: `pending://meta/${metaMediaId}`,
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
        title: `Triar documento sem solicitação: ${fileName}`,
        description: `Documento chegou pelo WhatsApp (${wabaId}), mas não foi vinculado automaticamente a uma solicitação pendente.`,
        status: 'WAITING_REVIEW',
        priority: 'HIGH',
        source: 'whatsapp'
      }
    });
  }

  await mediaDownloadQueue.add(
    'download-media',
    { documentFileId: fileRecord.id, metaMediaId, filename: fileName, mimeType },
    { jobId: `media-${metaMediaId}` }
  );

  app.log.info({ fileId: fileRecord.id, metaMediaId }, 'Job de download de mídia enfileirado');
}

export default whatsappRoutes;
