import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const taskStatuses = [
  'PENDING', 'IN_PROGRESS', 'WAITING_CLIENT',
  'WAITING_DOCUMENT', 'WAITING_REVIEW', 'DONE', 'OVERDUE', 'CANCELED'
];

const taskPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function normalizeStatus(status: unknown) {
  if (typeof status === 'string' && taskStatuses.includes(status)) return status;
  return 'PENDING';
}

function normalizePriority(priority: unknown) {
  if (typeof priority === 'string' && taskPriorities.includes(priority)) return priority;
  return 'MEDIUM';
}

const includeRelations = {
  client: true,
  company: true,
  documentRequest: true,
  assignedTo: { select: { id: true, name: true, email: true, role: true } }
};

const tasksRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/tasks', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = request.user;
    const { status, priority, clientId, companyId } = request.query as any;

    return prisma.task.findMany({
      where: {
        officeId,
        ...(status ? { status: normalizeStatus(status) as any } : {}),
        ...(priority ? { priority: normalizePriority(priority) as any } : {}),
        ...(clientId ? { clientId } : {}),
        ...(companyId ? { companyId } : {})
      },
      include: includeRelations,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
    });
  });

  app.get('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const task = await prisma.task.findFirst({
      where: { id, officeId },
      include: includeRelations
    });
    if (!task) return reply.code(404).send({ error: 'Task not found' });
    return task;
  });

  app.post('/api/tasks', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const data = request.body as any;
    if (!data?.title || typeof data.title !== 'string') {
      return reply.code(400).send({ error: 'Task title is required' });
    }
    return prisma.task.create({
      data: {
        officeId,
        title: data.title,
        description: data.description ?? null,
        clientId: data.clientId ?? null,
        companyId: data.companyId ?? null,
        documentRequestId: data.documentRequestId ?? null,
        assignedToId: data.assignedToId ?? null,
        status: normalizeStatus(data.status) as any,
        priority: normalizePriority(data.priority) as any,
        source: data.source || 'manual',
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      },
      include: includeRelations
    });
  });

  app.put('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const data = request.body as any;

    const existing = await prisma.task.findFirst({ where: { id, officeId } });
    if (!existing) return reply.code(404).send({ error: 'Task not found' });

    const nextStatus = data.status ? normalizeStatus(data.status) : existing.status;
    const nextPriority = data.priority ? normalizePriority(data.priority) : existing.priority;
    const completedAt =
      nextStatus === 'DONE' && existing.status !== 'DONE' ? new Date() : existing.completedAt;

    return prisma.task.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        clientId: data.clientId ?? existing.clientId,
        companyId: data.companyId ?? existing.companyId,
        documentRequestId: data.documentRequestId ?? existing.documentRequestId,
        assignedToId: data.assignedToId ?? existing.assignedToId,
        status: nextStatus as any,
        priority: nextPriority as any,
        source: data.source ?? existing.source,
        dueDate: data.dueDate ? new Date(data.dueDate) : existing.dueDate,
        completedAt
      },
      include: includeRelations
    });
  });

  app.delete('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const existing = await prisma.task.findFirst({ where: { id, officeId } });
    if (!existing) return reply.code(404).send({ error: 'Task not found' });
    await prisma.task.delete({ where: { id } });
    return { deleted: true };
  });
};

export default tasksRoutes;
