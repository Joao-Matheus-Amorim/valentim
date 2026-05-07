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
    const name = typeof data?.name === 'string' ? data.name.trim() : '';

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
};

export default peopleRoutes;
