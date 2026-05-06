import { api } from './api';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from '../types/company';

export async function listCompanies() {
  const response = await api.get<Company[]>('/companies');
  return response.data;
}

export async function getCompany(id: string) {
  const response = await api.get<Company>(`/companies/${id}`);
  return response.data;
}

export async function createCompany(input: CreateCompanyInput) {
  const response = await api.post<Company>('/companies', input);
  return response.data;
}

export async function updateCompany(id: string, input: UpdateCompanyInput) {
  const response = await api.put<Company>(`/companies/${id}`, input);
  return response.data;
}

export async function deleteCompany(id: string) {
  const response = await api.delete<{ deleted: true }>(`/companies/${id}`);
  return response.data;
}
