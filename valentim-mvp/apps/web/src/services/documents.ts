import { api } from './api';
import type { CreateDocumentInput, DocumentRequest, ReviewDocumentInput } from '../types/document';

export async function listDocuments() {
  const response = await api.get<DocumentRequest[]>('/documents');
  return response.data;
}

export async function getDocument(id: string) {
  const response = await api.get<DocumentRequest>(`/documents/${id}`);
  return response.data;
}

export async function createDocument(input: CreateDocumentInput) {
  const response = await api.post<DocumentRequest>('/documents', input);
  return response.data;
}

export async function reviewDocument(id: string, input: ReviewDocumentInput) {
  const response = await api.put<{ status: DocumentRequest['status'] }>(`/documents/${id}/review`, input);
  return response.data;
}
