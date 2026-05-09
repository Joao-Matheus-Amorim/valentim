/**
 * Valentim — Adaptador Evolution API
 *
 * Normaliza payloads da Evolution API para o formato interno do Valentim.
 * Suporta variações comuns do Evolution v1/v2, mantendo o formato interno
 * simples usado pela pipeline do WhatsApp.
 */

interface EvolutionMediaMessage {
  mimetype?: string;
  mimeType?: string;
  fileName?: string;
  filename?: string;
  title?: string;
  url?: string;
  mediaUrl?: string;
  fileUrl?: string;
  directPath?: string;
  mediaKey?: string;
  fileEncSha256?: string;
  fileSha256?: string;
  fileLength?: string | number;
  caption?: string;
}

interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  documentMessage?: EvolutionMediaMessage;
  imageMessage?: EvolutionMediaMessage & { caption?: string };
  audioMessage?: EvolutionMediaMessage;
  videoMessage?: EvolutionMediaMessage;
  stickerMessage?: EvolutionMediaMessage;
}

interface EvolutionKey {
  remoteJid?: string;
  participant?: string;
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
    source?: string;
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

function extractPhone(remoteJid?: string, participant?: string): string {
  const raw = remoteJid || participant || '';
  return raw.replace(/@.*$/, '').replace(/[^0-9]/g, '');
}

function isEvolutionPayload(body: unknown): body is EvolutionWebhookPayload {
  return typeof body === 'object' && body !== null && 'data' in body;
}

function getEventName(body: EvolutionWebhookPayload) {
  return String(body.event ?? '').toLowerCase();
}

function getMediaUrl(media: EvolutionMediaMessage) {
  return media.url ?? media.mediaUrl ?? media.fileUrl ?? null;
}

function getMimeType(media: EvolutionMediaMessage, fallback: string) {
  return media.mimetype ?? media.mimeType ?? fallback;
}

function getFileName(media: EvolutionMediaMessage, fallback: string) {
  return media.fileName ?? media.filename ?? media.title ?? fallback;
}

function getTextMessage(message: EvolutionMessageContent) {
  return message.conversation ?? message.extendedTextMessage?.text ?? null;
}

function isSupportedMessageEvent(eventName: string) {
  if (!eventName) return true;
  return eventName === 'messages.upsert' || eventName === 'messages_upsert' || eventName === 'send.message';
}

export function normalizeEvolutionPayload(body: unknown): NormalizedEvolutionMessage | null {
  if (!isEvolutionPayload(body)) return null;

  const eventName = getEventName(body);
  if (!isSupportedMessageEvent(eventName)) return null;

  const data = body.data;
  if (!data) return null;
  if (data.key?.fromMe === true) return null;

  const phone = extractPhone(data.key?.remoteJid, data.key?.participant);
  if (!phone) return null;

  const providerMessageId = data.key?.id ?? null;
  const msgType = data.messageType ?? '';
  const message = data.message ?? {};

  const documentMessage = message.documentMessage;
  if ((msgType === 'documentMessage' || documentMessage) && documentMessage) {
    return {
      providerMessageId,
      phone,
      messageType: 'DOCUMENT',
      body: documentMessage.caption ?? null,
      mediaUrl: getMediaUrl(documentMessage),
      fileName: getFileName(documentMessage, `documento-${providerMessageId ?? Date.now()}.pdf`),
      mimeType: getMimeType(documentMessage, 'application/octet-stream'),
      mediaId: documentMessage.mediaKey ?? documentMessage.fileSha256 ?? null,
      metaMediaId: null
    };
  }

  const imageMessage = message.imageMessage;
  if ((msgType === 'imageMessage' || imageMessage) && imageMessage) {
    return {
      providerMessageId,
      phone,
      messageType: 'IMAGE',
      body: imageMessage.caption ?? null,
      mediaUrl: getMediaUrl(imageMessage),
      fileName: getFileName(imageMessage, `imagem-${providerMessageId ?? Date.now()}.jpg`),
      mimeType: getMimeType(imageMessage, 'image/jpeg'),
      mediaId: imageMessage.mediaKey ?? imageMessage.fileSha256 ?? null,
      metaMediaId: null
    };
  }

  const text = getTextMessage(message);
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
