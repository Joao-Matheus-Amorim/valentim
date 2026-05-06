import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/dashboard', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = request.user;

    const [totalClients, totalCompanies, docs, charges, tasksByStatus] = await Promise.all([
      prisma.client.count({ where: { officeId } }),
      prisma.company.count({ where: { client: { officeId } } }),
      prisma.documentRequest.groupBy({
        by: ['status'],
        where: { company: { client: { officeId } } },
        _count: { _all: true }
      }),
      prisma.charge.groupBy({
        by: ['status'],
        where: { company: { client: { officeId } } },
        _sum: { amount: true }
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: { officeId },
        _count: { _all: true }
      })
    ]);

    return { totalClients, totalCompanies, documents: docs, charges, tasks: tasksByStatus };
  });
};

export default dashboardRoutes;
