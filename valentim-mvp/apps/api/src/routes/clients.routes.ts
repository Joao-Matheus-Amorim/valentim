import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const clientsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/clients', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = request.user;
    const clients = await prisma.client.findMany({
      where: { officeId },
      include: { companies: true }
    });
    return clients;
  });

  app.get('/api/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const client = await prisma.client.findFirst({
      where: { id, officeId },
      include: {
        companies: {
          include: { documentRequests: true }
        }
      }
    });
    if (!client) return reply.code(404).send({ error: 'Client not found' });
    return client;
  });

  app.post('/api/clients', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = request.user;
    const { name, phone } = request.body as any;
    const client = await prisma.client.create({
      data: { officeId, name, phone }
    });
    return client;
  });

  app.put('/api/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const data = request.body as any;
    const existing = await prisma.client.findFirst({ where: { id, officeId } });
    if (!existing) return reply.code(404).send({ error: 'Client not found' });
    const updated = await prisma.client.update({
      where: { id },
      data: { name: data.name ?? existing.name, phone: data.phone ?? existing.phone }
    });
    return updated;
  });

  app.delete('/api/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const existing = await prisma.client.findFirst({ where: { id, officeId } });
    if (!existing) return reply.code(404).send({ error: 'Client not found' });
    await prisma.client.delete({ where: { id } });
    return { deleted: true };
  });
};

export default clientsRoutes;
