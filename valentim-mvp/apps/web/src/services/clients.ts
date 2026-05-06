import { api } from './api';
import type { Client, CreateClientInput, UpdateClientInput } from '../types/client';

export async function listClients() {
  const response = await api.get<Client[]>('/clients');
  return response.data;
}

export async function getClient(id: string) {
  const response = await api.get<Client>(`/clients/${id}`);
  return response.data;
}

export async function createClient(input: CreateClientInput) {
  const response = await api.post<Client>('/clients', input);
  return response.data;
}

export async function updateClient(id: string, input: UpdateClientInput) {
  const response = await api.put<Client>(`/clients/${id}`, input);
  return response.data;
}

export async function deleteClient(id: string) {
  const response = await api.delete<{ deleted: true }>(`/clients/${id}`);
  return response.data;
}
