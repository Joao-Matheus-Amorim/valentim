import { api } from './api';
import type { CreatePersonInput, ListPeopleFilters, Person, UpdatePersonInput } from '../types/person';

function buildPeopleQuery(filters?: ListPeopleFilters) {
  const params = new URLSearchParams();

  if (filters?.clientId) params.set('clientId', filters.clientId);
  if (filters?.role) params.set('role', filters.role);

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listPeople(filters?: ListPeopleFilters) {
  const response = await api.get<Person[]>(`/people${buildPeopleQuery(filters)}`);
  return response.data;
}

export async function getPerson(id: string) {
  const response = await api.get<Person>(`/people/${id}`);
  return response.data;
}

export async function createPerson(input: CreatePersonInput) {
  const response = await api.post<Person>('/people', input);
  return response.data;
}

export async function updatePerson(id: string, input: UpdatePersonInput) {
  const response = await api.put<Person>(`/people/${id}`, input);
  return response.data;
}

export async function deletePerson(id: string) {
  const response = await api.delete<{ deleted: true }>(`/people/${id}`);
  return response.data;
}
