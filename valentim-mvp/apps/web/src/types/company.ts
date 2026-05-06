export interface CompanyClient {
  id: string;
  name: string;
  phone?: string | null;
}

export interface CompanyDocumentRequest {
  id: string;
  documentType: string;
  competence?: string | null;
  status: string;
  dueDate?: string | null;
}

export interface CompanyDeadline {
  id: string;
  name: string;
  dueDate: string;
  status: string;
}

export interface CompanyCharge {
  id: string;
  description: string;
  amount: string | number;
  dueDate: string;
  status: string;
}

export interface Company {
  id: string;
  clientId: string;
  name: string;
  cnpj?: string | null;
  regime?: string | null;
  createdAt?: string;
  updatedAt?: string;
  client?: CompanyClient;
  documentRequests?: CompanyDocumentRequest[];
  deadlines?: CompanyDeadline[];
  charges?: CompanyCharge[];
}

export interface CreateCompanyInput {
  clientId: string;
  name: string;
  cnpj?: string | null;
  regime?: string | null;
}

export interface UpdateCompanyInput {
  name?: string;
  cnpj?: string | null;
  regime?: string | null;
}
