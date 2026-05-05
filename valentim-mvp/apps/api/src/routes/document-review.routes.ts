import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const reviewRoutes: FastifyPluginAsync = async (app) => {
  app.put('/api/documents/:id/review', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as any;
    const { action } = request.body as any;
    const doc = await prisma.documentRequest.findUnique({ where: { id } });
    if (!doc) return reply.code(404).send({ error: 'Not found' });
    let status = doc.status;
    if (action === 'approve') status = 'APPROVED';
    else if (action === 'reject') status = 'REJECTED';
    await prisma.documentRequest.update({ where: { id }, data: { status } });
    return { status };
  });
};

export default reviewRoutes;
