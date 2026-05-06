import 'fastify';

export type AuthenticatedUser = {
  userId: string;
  officeId: string;
  role: 'ADMIN' | 'STAFF' | 'CLIENT';
};

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}
