import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const clientsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/clients', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const clients = await prisma.client.findMany({
      where: { officeId },
      include: { companies: true }
    });
    return clients;
  });

  app.get('/api/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const client = await prisma.client.findFirst({
      where: { id, officeId },
      include: {
        companies: {
          include: {
          documentRequests: true
          }
        }
      }
    });
    if (!client) return reply.code(404).send({ error: 'Client not found' });
    return client;
  });

  app.post('/api/clients', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { name, phone } = request.body as any;
    const client = await prisma.client.create({
      data: { officeId, name, phone }
    });
    return client;
  });

  app.put('/api/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const data = request.body as any;
    await prisma.client.updateMany({ where: { id, officeId }, data });
    return { updated: true };
  });

  app.delete('/api/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    await prisma.client.deleteMany({ where: { id, officeId } });
    return { deleted: true };
  });
};

export default clientsRoutes;
