import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const VALID_STATUS = ['PENDING', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_DOCUMENT', 'WAITING_REVIEW', 'DONE', 'OVERDUE', 'CANCELED'];
const VALID_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function safeStatus(value: unknown) {
  return typeof value === 'string' && VALID_STATUS.includes(value) ? value : 'PENDING';
}

function safePriority(value: unknown) {
  return typeof value === 'string' && VALID_PRIORITY.includes(value) ? value : 'MEDIUM';
}

const tasksRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/tasks', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = (request as any).user;
    const { status, priority, clientId, companyId } = request.query as any;

    const filters: string[] = ['"officeId" = $1'];
    const values: unknown[] = [officeId];

    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }
    if (priority) {
      values.push(priority);
      filters.push(`priority = $${values.length}`);
    }
    if (clientId) {
      values.push(clientId);
      filters.push('"clientId" = $' + values.length);
    }
    if (companyId) {
      values.push(companyId);
      filters.push('"companyId" = $' + values.length);
    }

    return prisma.$queryRawUnsafe(
      `SELECT * FROM "Task" WHERE ${filters.join(' AND ')} ORDER BY "dueDate" ASC NULLS LAST, "createdAt" DESC`,
      ...values
    );
  });

  app.post('/api/tasks', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const data = request.body as any;

    if (!data?.title || typeof data.title !== 'string') {
      return reply.code(400).send({ error: 'Task title is required' });
    }

    const id = randomUUID();
    const status = safeStatus(data.status);
    const priority = safePriority(data.priority);
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;

    const created = await prisma.$queryRawUnsafe(
      `INSERT INTO "Task" (
        id, "officeId", "clientId", "companyId", "documentRequestId", "assignedToId",
        title, description, status, priority, source, "dueDate", "createdAt", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) RETURNING *`,
      id,
      officeId,
      data.clientId || null,
      data.companyId || null,
      data.documentRequestId || null,
      data.assignedToId || null,
      data.title,
      data.description || null,
      status,
      priority,
      data.source || 'manual',
      dueDate
    );

    return created;
  });

  app.put('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const data = request.body as any;

    const existing = await prisma.$queryRawUnsafe('SELECT id FROM "Task" WHERE id = $1 AND "officeId" = $2 LIMIT 1', id, officeId) as any[];
    if (!existing.length) return reply.code(404).send({ error: 'Task not found' });

    const status = data.status ? safeStatus(data.status) : undefined;
    const priority = data.priority ? safePriority(data.priority) : undefined;
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;
    const completedAt = status === 'DONE' ? new Date() : null;

    return prisma.$queryRawUnsafe(
      `UPDATE "Task" SET
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        status = COALESCE($5, status),
        priority = COALESCE($6, priority),
        source = COALESCE($7, source),
        "clientId" = COALESCE($8, "clientId"),
        "companyId" = COALESCE($9, "companyId"),
        "documentRequestId" = COALESCE($10, "documentRequestId"),
        "assignedToId" = COALESCE($11, "assignedToId"),
        "dueDate" = COALESCE($12, "dueDate"),
        "completedAt" = COALESCE($13, "completedAt"),
        "updatedAt" = NOW()
      WHERE id = $1 AND "officeId" = $2
      RETURNING *`,
      id,
      officeId,
      data.title || null,
      data.description || null,
      status || null,
      priority || null,
      data.source || null,
      data.clientId || null,
      data.companyId || null,
      data.documentRequestId || null,
      data.assignedToId || null,
      dueDate,
      completedAt
    );
  });

  app.delete('/api/tasks/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;

    const deleted = await prisma.$executeRawUnsafe('DELETE FROM "Task" WHERE id = $1 AND "officeId" = $2', id, officeId);
    if (!deleted) return reply.code(404).send({ error: 'Task not found' });

    return { deleted: true };
  });
};

export default tasksRoutes;
