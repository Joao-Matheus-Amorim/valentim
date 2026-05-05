import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const clientsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/clients', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = (request as any).user;

    const clients = await prisma.client.findMany({
      where: { officeId },
      include: {
        companies: true,
        tasks: true
      },
      orderBy: {
        createdAt: 'desc'
      }
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
            documentRequests: true,
            deadlines: true,
            charges: true,
            tasks: true
          }
        },
        proposals: true,
        unmatchedDocuments: true,
        tasks: true
      }
    });

    if (!client) {
      return reply.code(404).send({ error: 'Client not found' });
    }

    return client;
  });

  app.post('/api/clients', { preHandler: authMiddleware }, async (request) => {
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

    const result = await prisma.client.updateMany({
      where: { id, officeId },
      data
    });

    if (result.count === 0) {
      return reply.code(404).send({ error: 'Client not found' });
    }

    return { updated: true };
  });

  app.delete('/api/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;

    const result = await prisma.client.deleteMany({
      where: { id, officeId }
    });

    if (result.count === 0) {
      return reply.code(404).send({ error: 'Client not found' });
    }

    return { deleted: true };
  });
};

export default clientsRoutes;