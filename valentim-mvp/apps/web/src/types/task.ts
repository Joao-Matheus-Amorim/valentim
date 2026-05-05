export type TaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'WAITING_DOCUMENT'
  | 'WAITING_REVIEW'
  | 'DONE'
  | 'OVERDUE'
  | 'CANCELED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskRelatedEntity {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  documentType?: string;
  competence?: string | null;
}

export interface Task {
  id: string;
  officeId: string;
  clientId?: string | null;
  companyId?: string | null;
  documentRequestId?: string | null;
  assignedToId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  source: string;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  client?: TaskRelatedEntity | null;
  company?: TaskRelatedEntity | null;
  documentRequest?: TaskRelatedEntity | null;
  assignedTo?: TaskRelatedEntity | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  source?: string;
  dueDate?: string | null;
  clientId?: string | null;
  companyId?: string | null;
  documentRequestId?: string | null;
  assignedToId?: string | null;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

export interface TaskFilters {
  status?: TaskStatus | 'ALL';
  priority?: TaskPriority | 'ALL';
  source?: string;
}

export const TASK_STATUSES: Array<{ value: TaskStatus; label: string }> = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'WAITING_CLIENT', label: 'Aguardando cliente' },
  { value: 'WAITING_DOCUMENT', label: 'Aguardando documento' },
  { value: 'WAITING_REVIEW', label: 'Aguardando revisão' },
  { value: 'DONE', label: 'Concluída' },
  { value: 'OVERDUE', label: 'Atrasada' },
  { value: 'CANCELED', label: 'Cancelada' }
];

export const TASK_PRIORITIES: Array<{ value: TaskPriority; label: string }> = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' }
];

export const TASK_SOURCES = [
  'manual',
  'document',
  'ai',
  'whatsapp',
  'deadline',
  'finance',
  'proposal'
];
