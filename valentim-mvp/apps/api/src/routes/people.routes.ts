import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const personRoles = ['OWNER', 'PARTNER', 'LEGAL_REPRESENTATIVE', 'RESPONSIBLE', 'CONTACT', 'OTHER'];

function normalizePersonRole(role: unknown) {
  if (typeof role === 'string' && personRoles.includes(role)) return role;
  return 'OTHER';
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function getRequiredName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

const includeRelations = {
  client: true,
  documentRequests: true,
  tasks: true
};

const peopleRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/people', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = request.user;
    const { clientId, role } = request.query as any;

    return prisma.person.findMany({
      where: {
        officeId,
        ...(clientId ? { clientId } : {}),
        ...(role ? { role: normalizePersonRole(role) as any } : {})
      },
      include: includeRelations,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }]
    });
  });

  app.get('/api/people/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const person = await prisma.person.findFirst({ where: { id, officeId }, include: includeRelations });
    if (!person) return reply.code(404).send({ error: 'Person not found' });
    return person;
  });

  app.post('/api/people', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const data = request.body as any;
    const name = getRequiredName(data?.name);

    if (!name) return reply.code(400).send({ error: 'Person name is required' });

    const clientId = data.clientId || null;
    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, officeId } });
      if (!client) return reply.code(400).send({ error: 'Invalid client' });
    }

    return prisma.person.create({
      data: {
        officeId,
        clientId,
        name,
        cpf: normalizeOptionalText(data.cpf),
        email: normalizeOptionalText(data.email),
        phone: normalizeOptionalText(data.phone),
        role: normalizePersonRole(data.role) as any
      },
      include: includeRelations
    });
  });

  app.put('/api/people/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const data = request.body as any;

    const existing = await prisma.person.findFirst({ where: { id, officeId } });
    if (!existing) return reply.code(404).send({ error: 'Person not found' });

    const clientId = data.clientId !== undefined ? data.clientId || null : existing.clientId;
    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, officeId } });
      if (!client) return reply.code(400).send({ error: 'Invalid client' });
    }

    const name = data.name !== undefined ? getRequiredName(data.name) : existing.name;
    if (!name) return reply.code(400).send({ error: 'Person name is required' });

    return prisma.person.update({
      where: { id: existing.id },
      data: {
        clientId,
        name,
        cpf: data.cpf !== undefined ? normalizeOptionalText(data.cpf) : existing.cpf,
        email: data.email !== undefined ? normalizeOptionalText(data.email) : existing.email,
        phone: data.phone !== undefined ? normalizeOptionalText(data.phone) : existing.phone,
        role: data.role !== undefined ? normalizePersonRole(data.role) as any : existing.role
      },
      include: includeRelations
    });
  });

  app.delete('/api/people/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;

    const existing = await prisma.person.findFirst({ where: { id, officeId } });
    if (!existing) return reply.code(404).send({ error: 'Person not found' });

    const [linkedDocuments, linkedTasks] = await Promise.all([
      prisma.documentRequest.count({ where: { personId: existing.id } }),
      prisma.task.count({ where: { personId: existing.id } })
    ]);

    if (linkedDocuments > 0 || linkedTasks > 0) {
      return reply.code(409).send({
        error: 'Person has linked documents or tasks',
        linkedDocuments,
        linkedTasks
      });
    }

    await prisma.person.delete({ where: { id: existing.id } });
    return { deleted: true };
  });
};

export default peopleRoutes;
