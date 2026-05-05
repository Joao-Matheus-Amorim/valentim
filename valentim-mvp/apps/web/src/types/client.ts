import type { Task } from './task';

export interface ClientCompany {
  id: string;
  name: string;
  cnpj?: string | null;
  regime?: string | null;
  documentRequests?: Array<{
    id: string;
    documentType: string;
    competence?: string | null;
    status: string;
    dueDate?: string | null;
  }>;
}

export interface Client {
  id: string;
  officeId: string;
  name: string;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
  companies?: ClientCompany[];
  tasks?: Task[];
}

export interface CreateClientInput {
  name: string;
  phone?: string | null;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {}
