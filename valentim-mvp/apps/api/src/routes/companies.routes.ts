import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { getIdParam } from '../lib/http';
import { nonEmptyString, optionalNullableString, parseBody } from '../lib/validation';

const createCompanyBodySchema = z.object({
  clientId: z.string().uuid(),
  name: nonEmptyString,
  cnpj: optionalNullableString,
  regime: optionalNullableString
});

const updateCompanyBodySchema = z.object({
  name: nonEmptyString.optional(),
  cnpj: optionalNullableString,
  regime: optionalNullableString
}).refine((data) => Object.keys(data).length > 0, 'At least one field is required');

const companiesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/companies', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = request.user;
    return prisma.company.findMany({
      where: { client: { officeId } },
      include: { client: true }
    });
  });

  app.get('/api/companies/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const company = await prisma.company.findFirst({
      where: { id, client: { officeId } },
      include: { client: true, documentRequests: true, deadlines: true, charges: true }
    });
    if (!company) return reply.code(404).send({ error: 'Company not found' });
    return company;
  });

  app.post('/api/companies', { preHandler: authMiddleware }, async (request, reply) => {
    const body = parseBody(createCompanyBodySchema, request.body, reply);
    if (!body) return;

    const { officeId } = request.user;
    const client = await prisma.client.findFirst({ where: { id: body.clientId, officeId } });
    if (!client) return reply.code(400).send({ error: 'Invalid client' });
    return prisma.company.create({
      data: {
        clientId: body.clientId,
        name: body.name,
        cnpj: body.cnpj ?? null,
        regime: body.regime ?? null
      }
    });
  });

  app.put('/api/companies/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const body = parseBody(updateCompanyBodySchema, request.body, reply);
    if (!body) return;

    const { officeId } = request.user;
    const existing = await prisma.company.findFirst({ where: { id, client: { officeId } } });
    if (!existing) return reply.code(404).send({ error: 'Company not found' });

    return prisma.company.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? existing.name,
        cnpj: body.cnpj !== undefined ? body.cnpj : existing.cnpj,
        regime: body.regime !== undefined ? body.regime : existing.regime
      }
    });
  });

  app.delete('/api/companies/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const existing = await prisma.company.findFirst({ where: { id, client: { officeId } } });
    if (!existing) return reply.code(404).send({ error: 'Company not found' });
    await prisma.company.delete({ where: { id } });
    return { deleted: true };
  });
};

export default companiesRoutes;
