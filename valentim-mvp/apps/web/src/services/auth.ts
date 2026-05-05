import { api, clearStoredToken, setStoredToken } from './api';
import type { AuthUser, LoginInput, LoginResponse, MeResponse } from '../types/auth';

export async function login(input: LoginInput) {
  const response = await api.post<LoginResponse>('/auth/login', input);
  setStoredToken(response.data.token);
  return response.data.token;
}

export async function getMe() {
  const response = await api.get<MeResponse>('/auth/me');
  return response.data.user;
}

export function logout() {
  clearStoredToken();
}

export function isStaffUser(user: AuthUser | null) {
  return user?.role === 'ADMIN' || user?.role === 'STAFF';
}
