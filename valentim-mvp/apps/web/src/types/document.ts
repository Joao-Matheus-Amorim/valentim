export type DocumentStatus =
  | 'PENDING'
  | 'SENT'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'OVERDUE';

export type DocumentTargetType = 'COMPANY' | 'PERSON';
export type DocumentReviewAction = 'approve' | 'reject';

export interface DocumentCompany {
  id: string;
  clientId: string;
  name: string;
  cnpj?: string | null;
  regime?: string | null;
}

export interface DocumentPerson {
  id: string;
  officeId: string;
  clientId?: string | null;
  name: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
}

export interface DocumentReviewer {
  id: string;
  name: string;
  email: string;
}

export interface DocumentFile {
  id: string;
  documentRequestId?: string | null;
  filename: string;
  mimeType: string;
  storageKey: string;
  createdAt?: string;
}

export interface DocumentAIAnalysis {
  id: string;
  documentRequestId?: string | null;
  documentFileId: string;
  documentType: string;
  competence?: string | null;
  cnpj?: string | null;
  totalValue?: string | number | null;
  confidence: number;
  summary?: string | null;
  flags: string[];
  model: string;
  analyzedAt?: string;
}

export interface UnmatchedDocument {
  id: string;
  documentRequestId?: string | null;
  clientId?: string | null;
  phone: string;
  storageKey: string;
  aiAnalysis?: unknown;
  triaged: boolean;
  staffNote?: string | null;
  receivedAt?: string;
}

export interface DocumentRequest {
  id: string;
  companyId: string;
  company?: DocumentCompany;
  targetType?: DocumentTargetType;
  personId?: string | null;
  person?: DocumentPerson | null;
  documentType: string;
  competence?: string | null;
  dueDate?: string | null;
  status: DocumentStatus;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewedBy?: DocumentReviewer | null;
  createdAt?: string;
  updatedAt?: string;
  files?: DocumentFile[];
  aiAnalyses?: DocumentAIAnalysis[];
  unmatchedDocuments?: UnmatchedDocument[];
}

export interface CreateDocumentInput {
  companyId: string;
  targetType?: DocumentTargetType;
  personId?: string | null;
  documentType: string;
  competence?: string | null;
  dueDate?: string | null;
}

export interface ReviewDocumentInput {
  action: DocumentReviewAction;
  reason?: string;
}
