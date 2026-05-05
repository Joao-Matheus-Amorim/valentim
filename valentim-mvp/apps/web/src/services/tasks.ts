import { api } from './api';
import type { CreateTaskInput, Task, TaskFilters, UpdateTaskInput } from '../types/task';

function buildTaskQuery(filters?: TaskFilters) {
  const params = new URLSearchParams();

  if (filters?.status && filters.status !== 'ALL') {
    params.set('status', filters.status);
  }

  if (filters?.priority && filters.priority !== 'ALL') {
    params.set('priority', filters.priority);
  }

  const query = params.toString();
  return query ? `/tasks?${query}` : '/tasks';
}

export async function listTasks(filters?: TaskFilters) {
  const response = await api.get<Task[]>(buildTaskQuery(filters));
  return response.data;
}

export async function createTask(input: CreateTaskInput) {
  const response = await api.post<Task>('/tasks', input);
  return response.data;
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const response = await api.put<Task>(`/tasks/${id}`, input);
  return response.data;
}

export async function completeTask(id: string) {
  return updateTask(id, { status: 'DONE' });
}

export async function cancelTask(id: string) {
  return updateTask(id, { status: 'CANCELED' });
}
