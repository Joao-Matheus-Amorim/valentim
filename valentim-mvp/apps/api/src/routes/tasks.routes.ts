import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const tasksRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/tasks', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = (request as any).user;
    const { status, priority, clientId, companyId } = request.query as any;

    return prisma.task.findMany({
      where: {
        officeId,
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(clientId ? { clientId } : {}),
        ...(companyId ? { companyId } : {})
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  });

  app.post('/api/tasks', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = (request as any).user;
    const data = request.body as any;

    return prisma.task.create({
      data: {
        officeId,
        title: data.title,
        description: data.description,
        clientId: data.clientId,
        companyId: data.companyId,
        documentRequestId: data.documentRequestId,
        assignedToId: data.assignedToId,
        status: data.status || 'PENDING',
        priority: data.priority || 'MEDIUM',
        source: data.source || 'manual',
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      }
    });
  });

  app.put('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const data = request.body as any;

    const task = await prisma.task.findFirst({ where: { id, officeId } });
    if (!task) return reply.code(404).send({ error: 'Task not found' });

    return prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        clientId: data.clientId,
        companyId: data.companyId,
        documentRequestId: data.documentRequestId,
        assignedToId: data.assignedToId,
        status: data.status,
        priority: data.priority,
        source: data.source,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate,
        completedAt: data.status === 'DONE' ? new Date() : data.completedAt
      }
    });
  });

  app.delete('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;

    const task = await prisma.task.findFirst({ where: { id, officeId } });
    if (!task) return reply.code(404).send({ error: 'Task not found' });

    await prisma.task.delete({ where: { id } });
    return { deleted: true };
  });
};

export default tasksRoutes;
