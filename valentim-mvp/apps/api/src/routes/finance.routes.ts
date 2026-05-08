import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { getIdParam } from '../lib/http';

const financeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/charges', { preHandler: authMiddleware }, async (request) => {
    const { officeId } = request.user;
    const charges = await prisma.charge.findMany({
      where: { company: { client: { officeId } } },
      include: { company: true }
    });
    return charges;
  });

  app.post('/api/charges', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { companyId, description, amount, dueDate, status } = request.body as any;
    const company = await prisma.company.findFirst({ where: { id: companyId, client: { officeId } } });
    if (!company) return reply.code(400).send({ error: 'Invalid company' });
    const charge = await prisma.charge.create({
      data: { companyId, description, amount, dueDate: new Date(dueDate), status }
    });
    return charge;
  });

  app.put('/api/charges/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const data = request.body as any;
    const existing = await prisma.charge.findFirst({
      where: { id, company: { client: { officeId } } }
    });
    if (!existing) return reply.code(404).send({ error: 'Charge not found' });

    const updated = await prisma.charge.update({
      where: { id: existing.id },
      data: {
        description: data.description ?? existing.description,
        amount: data.amount ?? existing.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : existing.dueDate,
        status: data.status ?? existing.status
      }
    });
    return updated;
  });

  app.delete('/api/charges/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const existing = await prisma.charge.findFirst({
      where: { id, company: { client: { officeId } } }
    });
    if (!existing) return reply.code(404).send({ error: 'Charge not found' });
    await prisma.charge.delete({ where: { id } });
    return { deleted: true };
  });
};

export default financeRoutes;
