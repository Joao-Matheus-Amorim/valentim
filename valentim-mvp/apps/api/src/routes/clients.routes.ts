import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { getIdParam } from '../lib/http';
import { nonEmptyString, optionalNullableString, parseBody } from '../lib/validation';
import { hasPaginationQuery, normalizePagination, paginationQuerySchema } from '../lib/pagination';

const createClientBodySchema = z.object({
  name: nonEmptyString,
  phone: optionalNullableString
});

const updateClientBodySchema = z.object({
  name: nonEmptyString.optional(),
  phone: optionalNullableString
}).refine((data) => Object.keys(data).length > 0, 'At least one field is required');

const clientsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/clients', { preHandler: authMiddleware }, async (request, reply) => {
    const query = paginationQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        error: 'Invalid query parameters',
        issues: query.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { officeId } = request.user;
    const { page, limit, skip, search } = normalizePagination(query.data);
    const where = {
      officeId,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {})
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: { companies: true },
        orderBy: { createdAt: 'desc' },
        ...(hasPaginationQuery(request.query) ? { skip, take: limit } : {})
      }),
      hasPaginationQuery(request.query) ? prisma.client.count({ where }) : Promise.resolve(0)
    ]);

    if (!hasPaginationQuery(request.query)) return clients;
    return { data: clients, total, page, limit };
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
