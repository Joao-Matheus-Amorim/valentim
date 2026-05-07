export type PersonRole =
  | 'OWNER'
  | 'PARTNER'
  | 'LEGAL_REPRESENTATIVE'
  | 'RESPONSIBLE'
  | 'CONTACT'
  | 'OTHER';

export const PERSON_ROLE_OPTIONS: Array<{ value: PersonRole; label: string }> = [
  { value: 'OWNER', label: 'Dono' },
  { value: 'PARTNER', label: 'Sócio' },
  { value: 'LEGAL_REPRESENTATIVE', label: 'Representante legal' },
  { value: 'RESPONSIBLE', label: 'Responsável' },
  { value: 'CONTACT', label: 'Contato' },
  { value: 'OTHER', label: 'Outro' }
];

export const personRoleLabels: Record<PersonRole, string> = Object.fromEntries(
  PERSON_ROLE_OPTIONS.map((role) => [role.value, role.label])
) as Record<PersonRole, string>;

export interface PersonClient {
  id: string;
  name: string;
  phone?: string | null;
}

export interface PersonDocumentRequest {
  id: string;
  companyId: string;
  targetType?: 'COMPANY' | 'PERSON';
  documentType: string;
  competence?: string | null;
  status: string;
  dueDate?: string | null;
}

export interface PersonTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
}

export interface Person {
  id: string;
  officeId: string;
  clientId?: string | null;
  name: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  role: PersonRole;
  createdAt?: string;
  updatedAt?: string;
  client?: PersonClient | null;
  documentRequests?: PersonDocumentRequest[];
  tasks?: PersonTask[];
}

export interface CreatePersonInput {
  clientId?: string | null;
  name: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: PersonRole;
}

export interface UpdatePersonInput {
  clientId?: string | null;
  name?: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: PersonRole;
}

export interface ListPeopleFilters {
  clientId?: string;
  role?: PersonRole;
}
