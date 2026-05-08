import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { getIdParam } from '../lib/http';
import { nonEmptyString, optionalNullableString, parseBody } from '../lib/validation';

const createClientBodySchema = z.object({
  name: nonEmptyString,
  phone: optionalNullableString
});

const updateClientBodySchema = z.object({
  name: nonEmptyString.optional(),
  phone: optionalNullableString
}).refine((data) => Object.keys(data).length > 0, 'At least one field is required');

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
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
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

  app.post('/api/clients', { preHandler: authMiddleware }, async (request, reply) => {
    const body = parseBody(createClientBodySchema, request.body, reply);
    if (!body) return;

    const { officeId } = request.user;
    const client = await prisma.client.create({
      data: { officeId, name: body.name, phone: body.phone ?? null }
    });
    return client;
  });

  app.put('/api/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const body = parseBody(updateClientBodySchema, request.body, reply);
    if (!body) return;

    const { officeId } = request.user;
    const existing = await prisma.client.findFirst({ where: { id, officeId } });
    if (!existing) return reply.code(404).send({ error: 'Client not found' });
    const updated = await prisma.client.update({
      where: { id },
      data: { name: body.name ?? existing.name, phone: body.phone !== undefined ? body.phone : existing.phone }
    });
    return updated;
  });

  app.delete('/api/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const existing = await prisma.client.findFirst({ where: { id, officeId } });
    if (!existing) return reply.code(404).send({ error: 'Client not found' });
    await prisma.client.delete({ where: { id } });
    return { deleted: true };
  });
};

export default clientsRoutes;
