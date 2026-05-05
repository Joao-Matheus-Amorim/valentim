import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/dashboard', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const totalClients = await prisma.client.count({ where: { officeId } });
    const totalCompanies = await prisma.company.count({ where: { client: { officeId } } });
    const docs = await prisma.documentRequest.groupBy({
      by: ['status'],
      where: { company: { client: { officeId } } },
      _count: { _all: true }
    });
    const charges = await prisma.charge.groupBy({
      by: ['status'],
      where: { company: { client: { officeId } } },
      _sum: { amount: true }
    });
    return { totalClients, totalCompanies, documents: docs, charges };
  });
};

export default dashboardRoutes;
