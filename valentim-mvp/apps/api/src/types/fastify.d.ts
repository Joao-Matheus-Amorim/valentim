import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      officeId: string;
      role: string;
      name: string;
      email: string;
    };
  }
}
