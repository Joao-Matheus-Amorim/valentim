import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const taskStatuses = [
  'PENDING',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'WAITING_DOCUMENT',
  'WAITING_REVIEW',
  'DONE',
  'OVERDUE',
  'CANCELED'
];

const taskPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function normalizeStatus(status: unknown) {
  if (typeof status === 'string' && taskStatuses.includes(status)) {
    return status;
  }

  return 'PENDING';
}

function normalizePriority(priority: unknown) {
  if (typeof priority === 'string' && taskPriorities.includes(priority)) {
    return priority;
  }

  return 'MEDIUM';
}

const tasksRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/tasks', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = (request as any).user;
    const { status, priority, clientId, companyId } = request.query as any;

    const tasks = await prisma.task.findMany({
      where: {
        officeId,
        ...(status ? { status: normalizeStatus(status) as any } : {}),
        ...(priority ? { priority: normalizePriority(priority) as any } : {}),
        ...(clientId ? { clientId } : {}),
        ...(companyId ? { companyId } : {})
      },
      include: {
        client: true,
        company: true,
        documentRequest: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return tasks;
  });

  app.get('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;

    const task = await prisma.task.findFirst({
      where: {
        id,
        officeId
      },
      include: {
        client: true,
        company: true,
        documentRequest: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    return task;
  });

  app.post('/api/tasks', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const data = request.body as any;

    if (!data?.title || typeof data.title !== 'string') {
      return reply.code(400).send({ error: 'Task title is required' });
    }

    const task = await prisma.task.create({
      data: {
        officeId,
        title: data.title,
        description: data.description || null,
        clientId: data.clientId || null,
        companyId: data.companyId || null,
        documentRequestId: data.documentRequestId || null,
        assignedToId: data.assignedToId || null,
        status: normalizeStatus(data.status) as any,
        priority: normalizePriority(data.priority) as any,
        source: data.source || 'manual',
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      },
      include: {
        client: true,
        company: true,
        documentRequest: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return task;
  });

  app.put('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const data = request.body as any;

    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        officeId
      }
    });

    if (!existingTask) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const nextStatus = data.status ? normalizeStatus(data.status) : existingTask.status;
    const nextPriority = data.priority ? normalizePriority(data.priority) : existingTask.priority;

    const completedAt =
      nextStatus === 'DONE' && existingTask.status !== 'DONE'
        ? new Date()
        : existingTask.completedAt;

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title ?? existingTask.title,
        description: data.description ?? existingTask.description,
        clientId: data.clientId ?? existingTask.clientId,
        companyId: data.companyId ?? existingTask.companyId,
        documentRequestId: data.documentRequestId ?? existingTask.documentRequestId,
        assignedToId: data.assignedToId ?? existingTask.assignedToId,
        status: nextStatus as any,
        priority: nextPriority as any,
        source: data.source ?? existingTask.source,
        dueDate: data.dueDate ? new Date(data.dueDate) : existingTask.dueDate,
        completedAt
      },
      include: {
        client: true,
        company: true,
        documentRequest: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return task;
  });

  app.delete('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;

    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        officeId
      }
    });

    if (!existingTask) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    await prisma.task.delete({
      where: { id }
    });

    return { deleted: true };
  });
};

export default tasksRoutes;