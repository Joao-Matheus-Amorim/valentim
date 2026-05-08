import { FastifyReply } from 'fastify';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getIdParam(params: unknown, reply: FastifyReply): string | null {
  const { id } = params as { id?: unknown };

  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    reply.code(400).send({ error: 'Invalid id parameter' });
    return null;
  }

  return id;
}
