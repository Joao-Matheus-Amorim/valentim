/**
 * Valentim — Adaptador Evolution API
 *
 * Normaliza payloads da Evolution API para o formato interno do Valentim.
 */

interface EvolutionMediaMessage {
  mimetype?: string;
  fileName?: string;
  url?: string;
  mediaKey?: string;
  fileEncSha256?: string;
  fileSha256?: string;
  fileLength?: string;
  caption?: string;
}

interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  documentMessage?: EvolutionMediaMessage;
  imageMessage?: EvolutionMediaMessage & { caption?: string };
  audioMessage?: EvolutionMediaMessage;
  videoMessage?: EvolutionMediaMessage;
}

interface EvolutionKey {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
}

interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  data?: {
    key?: EvolutionKey;
    message?: EvolutionMessageContent;
    messageType?: string;
    pushName?: string;
    messageTimestamp?: number;
  };
}

export interface NormalizedEvolutionMessage {
  providerMessageId: string | null;
  phone: string;
  messageType: 'TEXT' | 'DOCUMENT' | 'IMAGE' | 'OTHER';
  body: string | null;
  mediaUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  mediaId: string | null;
  metaMediaId: string | null;
}

function extractPhone(remoteJid?: string): string {
  if (!remoteJid) return '';
  return remoteJid.replace(/@.*$/, '').replace(/[^0-9]/g, '');
}

function isEvolutionPayload(body: unknown): body is EvolutionWebhookPayload {
  return typeof body === 'object' && body !== null && 'event' in body && 'data' in body;
}

export function normalizeEvolutionPayload(body: unknown): NormalizedEvolutionMessage | null {
  if (!isEvolutionPayload(body)) return null;
  if (body.event !== 'messages.upsert') return null;

  const data = body.data;
  if (!data) return null;
  if (data.key?.fromMe === true) return null;

  const phone = extractPhone(data.key?.remoteJid);
  if (!phone) return null;

  const providerMessageId = data.key?.id ?? null;
  const msgType = data.messageType ?? '';
  const message = data.message ?? {};

  if (msgType === 'documentMessage' && message.documentMessage) {
    const doc = message.documentMessage;
    return {
      providerMessageId,
      phone,
      messageType: 'DOCUMENT',
      body: doc.caption ?? null,
      mediaUrl: doc.url ?? null,
      fileName: doc.fileName ?? `documento-${providerMessageId ?? Date.now()}.pdf`,
      mimeType: doc.mimetype ?? 'application/octet-stream',
      mediaId: doc.mediaKey ?? null,
      metaMediaId: null
    };
  }

  if (msgType === 'imageMessage' && message.imageMessage) {
    const img = message.imageMessage;
    return {
      providerMessageId,
      phone,
      messageType: 'IMAGE',
      body: img.caption ?? null,
      mediaUrl: img.url ?? null,
      fileName: `imagem-${providerMessageId ?? Date.now()}.jpg`,
      mimeType: img.mimetype ?? 'image/jpeg',
      mediaId: img.mediaKey ?? null,
      metaMediaId: null
    };
  }

  const text = message.conversation ?? message.extendedTextMessage?.text ?? null;

  if (text) {
    return {
      providerMessageId,
      phone,
      messageType: 'TEXT',
      body: text,
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
