export const USER_ROLES = ["ADMIN", "STAFF", "CLIENT"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DOCUMENT_STATUSES = [
  "PENDING",
  "SENT",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "OVERDUE",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const CONVERSATION_STATES = [
  "IDLE",
  "WAITING_DOC",
  "PROCESSING",
  "CONFIRMED",
  "UNDER_REVIEW",
  "REMINDER_SENT",
  "OVERDUE",
] as const;
export type ConversationState = (typeof CONVERSATION_STATES)[number];

export const WHATSAPP_MESSAGE_TYPES = [
  "TEXT",
  "IMAGE",
  "DOCUMENT",
  "AUDIO",
  "VIDEO",
  "STICKER",
  "UNKNOWN",
] as const;
export type WhatsAppMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];

export const WHATSAPP_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
export type WhatsAppDirection = (typeof WHATSAPP_DIRECTIONS)[number];

export const PROCESSING_STATUSES = [
  "RECEIVED",
  "QUEUED",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const AI_DECISION_TYPES = [
  "AUTO_MATCH",
  "REVIEW_REQUIRED",
  "REQUEST_REUPLOAD",
  "UNMATCHED",
] as const;
export type AiDecisionType = (typeof AI_DECISION_TYPES)[number];

export const DEFAULT_AI_CONFIDENCE_THRESHOLD = 0.75;
export const DEFAULT_AI_REVIEW_THRESHOLD = 0.5;

export interface AiDocumentAnalysisResult {
  documentType: string;
  competenceMonth: number | null;
  competenceYear: number | null;
  cnpj: string | null;
  cpf: string | null;
  totalValue: number | null;
  dueDate: string | null;
  confidence: number;
  summary: string;
  flags: string[];
}

export interface WhatsAppNormalizedMessage {
  provider: "mock" | "meta" | "zapi" | "evolution";
  providerMessageId: string;
  phone: string;
  direction: WhatsAppDirection;
  messageType: WhatsAppMessageType;
  body?: string;
  mediaId?: string;
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
  receivedAt: string;
  rawPayload: unknown;
}

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "done" | "failed";
}
