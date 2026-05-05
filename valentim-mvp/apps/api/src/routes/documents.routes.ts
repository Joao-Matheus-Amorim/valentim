import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const documentsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/documents', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const documents = await prisma.documentRequest.findMany({
      where: { company: { client: { officeId } } },
      include: { company: true, files: true }
    });
    return documents;
  });

  app.post('/api/documents', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { companyId, documentType, competence, dueDate } = request.body as any;
    const company = await prisma.company.findFirst({ where: { id: companyId, client: { officeId } } });
    if (!company) return reply.code(400).send({ error: 'Invalid company' });
    const doc = await prisma.documentRequest.create({
      data: { companyId, documentType, competence, dueDate: dueDate ? new Date(dueDate) : null }
    });
    return doc;
  });

  app.get('/api/documents/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const doc = await prisma.documentRequest.findFirst({
      where: { id, company: { client: { officeId } } },
      include: { files: true, aiAnalyses: true, unmatchedDocuments: true }
    });
    if (!doc) return reply.code(404).send({ error: 'Not found' });
    return doc;
  });
};

export default documentsRoutes;
