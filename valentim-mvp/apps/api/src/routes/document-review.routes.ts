import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const REUPLOAD_TASK_SOURCE = 'document-review-reupload';

function buildDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return date;
}

async function closeOpenReuploadTasks(input: {
  officeId: string;
  documentRequestId: string;
  completedAt: Date;
}) {
  return prisma.task.updateMany({
    where: {
      officeId: input.officeId,
      documentRequestId: input.documentRequestId,
      source: REUPLOAD_TASK_SOURCE,
      status: { notIn: ['DONE', 'CANCELED'] }
    },
    data: {
      status: 'DONE',
      completedAt: input.completedAt
    }
  });
}

async function createOrUpdateReuploadTask(input: {
  officeId: string;
  clientId: string;
  companyId: string;
  documentRequestId: string;
  documentType: string;
  competence?: string | null;
  companyName?: string | null;
  reason: string;
}) {
  const title = `Solicitar reenvio: ${input.documentType}`;
  const description = [
    `Documento: ${input.documentType}`,
    `Empresa: ${input.companyName || 'não informada'}`,
    `Competência: ${input.competence || 'não informada'}`,
    `Motivo: ${input.reason}`
  ].join('\n');

  const existing = await prisma.task.findFirst({
    where: {
      officeId: input.officeId,
      documentRequestId: input.documentRequestId,
      source: REUPLOAD_TASK_SOURCE,
      status: { notIn: ['DONE', 'CANCELED'] }
    }
  });

  const data = {
    title,
    description,
    status: 'WAITING_CLIENT' as const,
    priority: 'HIGH' as const,
    source: REUPLOAD_TASK_SOURCE,
    dueDate: buildDueDate(),
    completedAt: null
  };

  if (existing) {
    return prisma.task.update({ where: { id: existing.id }, data });
  }

  return prisma.task.create({
    data: {
      officeId: input.officeId,
      clientId: input.clientId,
      companyId: input.companyId,
      documentRequestId: input.documentRequestId,
      ...data
    }
  });
}

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
      },
      include: { company: true }
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

      const closedTasks = await closeOpenReuploadTasks({
        officeId,
        documentRequestId: doc.id,
        completedAt: reviewedAt
      });

      return {
        status: updated.status,
        rejectionReason: updated.rejectionReason,
        reviewedAt: updated.reviewedAt,
        reviewedById: updated.reviewedById,
        closedReuploadTasks: closedTasks.count
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

      const task = await createOrUpdateReuploadTask({
        officeId,
        clientId: doc.company.clientId,
        companyId: doc.companyId,
        documentRequestId: doc.id,
        documentType: doc.documentType,
        competence: doc.competence,
        companyName: doc.company.name,
        reason: rejectionReason
      });

      return {
        status: updated.status,
        rejectionReason: updated.rejectionReason,
        reviewedAt: updated.reviewedAt,
        reviewedById: updated.reviewedById,
        taskId: task.id
      };
    }

    return reply.code(400).send({ error: 'Invalid review action' });
  });
};

export default reviewRoutes;
