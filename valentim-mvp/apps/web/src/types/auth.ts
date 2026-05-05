export type UserRole = 'ADMIN' | 'STAFF' | 'CLIENT';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  officeId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface MeResponse {
  user: AuthUser | null;
}
