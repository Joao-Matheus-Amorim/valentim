import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const reviewRoutes: FastifyPluginAsync = async (app) => {
  app.put('/api/documents/:id/review', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = request.user;
    const { id } = request.params as any;
    const { action } = request.body as any;

    const doc = await prisma.documentRequest.findFirst({
      where: {
        id,
        company: {
          client: {
            officeId
          }
        }
      }
    });

    if (!doc) return reply.code(404).send({ error: 'Not found' });

    let status = doc.status;
    if (action === 'approve') status = 'APPROVED';
    else if (action === 'reject') status = 'REJECTED';
    else return reply.code(400).send({ error: 'Invalid review action' });

    const updated = await prisma.documentRequest.update({
      where: { id: doc.id },
      data: { status }
    });

    return { status: updated.status };
  });
};

export default reviewRoutes;
