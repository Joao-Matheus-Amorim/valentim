import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const reviewRoutes: FastifyPluginAsync = async (app) => {
  app.put('/api/documents/:id/review', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId, userId } = request.user;
    const { id } = request.params as any;
    const { action, reason } = request.body as any;

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

    const reviewedAt = new Date();

    if (action === 'approve') {
      const updated = await prisma.documentRequest.update({
        where: { id: doc.id },
        data: {
          status: 'APPROVED',
          rejectionReason: null,
          reviewedAt,
          reviewedById: userId
        }
      });

      return {
        status: updated.status,
        rejectionReason: updated.rejectionReason,
        reviewedAt: updated.reviewedAt,
        reviewedById: updated.reviewedById
      };
    }

    if (action === 'reject') {
      const rejectionReason = typeof reason === 'string' ? reason.trim() : '';

      if (!rejectionReason) {
        return reply.code(400).send({ error: 'Rejection reason is required' });
      }

      const updated = await prisma.documentRequest.update({
        where: { id: doc.id },
        data: {
          status: 'REJECTED',
          rejectionReason,
          reviewedAt,
          reviewedById: userId
        }
      });

      return {
        status: updated.status,
        rejectionReason: updated.rejectionReason,
        reviewedAt: updated.reviewedAt,
        reviewedById: updated.reviewedById
      };
    }

    return reply.code(400).send({ error: 'Invalid review action' });
  });
};

export default reviewRoutes;
