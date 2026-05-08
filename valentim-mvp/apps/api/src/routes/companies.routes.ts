import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { getIdParam } from '../lib/http';

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
    const { officeId } = request.user;
    const { clientId, name, cnpj, regime } = request.body as any;
    const client = await prisma.client.findFirst({ where: { id: clientId, officeId } });
    if (!client) return reply.code(400).send({ error: 'Invalid client' });
    return prisma.company.create({ data: { clientId, name, cnpj, regime } });
  });

  app.put('/api/companies/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const data = request.body as any;
    const existing = await prisma.company.findFirst({ where: { id, client: { officeId } } });
    if (!existing) return reply.code(404).send({ error: 'Company not found' });

    return prisma.company.update({
      where: { id: existing.id },
      data: {
        name: data.name ?? existing.name,
        cnpj: data.cnpj !== undefined ? data.cnpj : existing.cnpj,
        regime: data.regime !== undefined ? data.regime : existing.regime
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
