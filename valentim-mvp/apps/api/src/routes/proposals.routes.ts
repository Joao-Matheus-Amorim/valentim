import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const proposalsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/proposals', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = request.user;
    const proposals = await prisma.proposal.findMany({
      where: { client: { officeId } },
      include: { client: true }
    });
    return proposals;
  });

  app.post('/api/proposals', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { clientId, title, description, value, status } = request.body as any;
    const client = await prisma.client.findFirst({ where: { id: clientId, officeId } });
    if (!client) return reply.code(400).send({ error: 'Invalid client' });
    const proposal = await prisma.proposal.create({
      data: { clientId, title, description, value, status }
    });
    return proposal;
  });

  app.put('/api/proposals/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const data = request.body as any;
    const existing = await prisma.proposal.findFirst({
      where: { id, client: { officeId } }
    });
    if (!existing) return reply.code(404).send({ error: 'Proposal not found' });

    const updated = await prisma.proposal.update({
      where: { id: existing.id },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        value: data.value ?? existing.value,
        status: data.status ?? existing.status
      }
    });
    return updated;
  });

  app.delete('/api/proposals/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const existing = await prisma.proposal.findFirst({
      where: { id, client: { officeId } }
    });
    if (!existing) return reply.code(404).send({ error: 'Proposal not found' });
    await prisma.proposal.delete({ where: { id } });
    return { deleted: true };
  });
};

export default proposalsRoutes;
