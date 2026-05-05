import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const deadlinesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/deadlines', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const deadlines = await prisma.deadline.findMany({
      where: { company: { client: { officeId } } },
      include: { company: true }
    });
    return deadlines;
  });

  app.post('/api/deadlines', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { companyId, name, dueDate, status } = request.body as any;
    const company = await prisma.company.findFirst({ where: { id: companyId, client: { officeId } } });
    if (!company) return reply.code(400).send({ error: 'Invalid company' });
    const deadline = await prisma.deadline.create({
      data: { companyId, name, dueDate: new Date(dueDate), status }
    });
    return deadline;
  });

  app.put('/api/deadlines/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as any;
    const data = request.body as any;
    await prisma.deadline.update({ where: { id }, data });
    return { updated: true };
  });

  app.delete('/api/deadlines/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.deadline.delete({ where: { id } });
    return { deleted: true };
  });
};

export default deadlinesRoutes;
