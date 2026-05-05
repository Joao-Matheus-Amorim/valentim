import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const companiesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/companies', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const companies = await prisma.company.findMany({
      where: { client: { officeId } },
      include: { documentRequests: true }
    });
    return companies;
  });

  app.get('/api/companies/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const company = await prisma.company.findFirst({
      where: { id, client: { officeId } },
      include: { documentRequests: true }
    });
    if (!company) return reply.code(404).send({ error: 'Not found' });
    return company;
  });

  app.post('/api/companies', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { clientId, name, cnpj, regime } = request.body as any;
    const client = await prisma.client.findFirst({ where: { id: clientId, officeId } });
    if (!client) return reply.code(400).send({ error: 'Invalid client' });
    const company = await prisma.company.create({ data: { clientId, name, cnpj, regime } });
    return company;
  });

  app.put('/api/companies/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const data = request.body as any;
    const company = await prisma.company.findFirst({ where: { id, client: { officeId } } });
    if (!company) return reply.code(404).send({ error: 'Not found' });
    await prisma.company.update({ where: { id }, data });
    return { updated: true };
  });

  app.delete('/api/companies/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const company = await prisma.company.findFirst({ where: { id, client: { officeId } } });
    if (!company) return reply.code(404).send({ error: 'Not found' });
    await prisma.company.delete({ where: { id } });
    return { deleted: true };
  });
};

export default companiesRoutes;
