import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';

const documentInclude = {
  company: true,
  person: true,
  files: true,
  reviewedBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
};

function normalizeDocumentTargetType(value: unknown) {
  return value === 'PERSON' ? 'PERSON' : 'COMPANY';
}

const documentsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/documents', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const documents = await prisma.documentRequest.findMany({
      where: { company: { client: { officeId } } },
      include: documentInclude
    });
    return documents;
  });

  app.post('/api/documents', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { companyId, documentType, competence, dueDate, targetType, personId } = request.body as any;
    const normalizedTargetType = normalizeDocumentTargetType(targetType);
    const normalizedDocumentType = typeof documentType === 'string' ? documentType.trim() : '';

    if (!companyId) return reply.code(400).send({ error: 'Company is required' });
    if (!normalizedDocumentType) return reply.code(400).send({ error: 'Document type is required' });

    const company = await prisma.company.findFirst({ where: { id: companyId, client: { officeId } } });
    if (!company) return reply.code(400).send({ error: 'Invalid company' });

    let normalizedPersonId: string | null = null;

    if (normalizedTargetType === 'PERSON') {
      if (!personId) return reply.code(400).send({ error: 'Person is required for personal document' });

      const person = await prisma.person.findFirst({
        where: {
          id: personId,
          officeId,
          OR: [
            { clientId: company.clientId },
            { clientId: null }
          ]
        }
      });

      if (!person) return reply.code(400).send({ error: 'Invalid person' });
      normalizedPersonId = person.id;
    }

    const doc = await prisma.documentRequest.create({
      data: {
        companyId,
        targetType: normalizedTargetType as any,
        personId: normalizedPersonId,
        documentType: normalizedDocumentType,
        competence: typeof competence === 'string' && competence.trim() ? competence.trim() : null,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: documentInclude
    });

    return doc;
  });

  app.get('/api/documents/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { officeId } = (request as any).user;
    const { id } = request.params as any;
    const doc = await prisma.documentRequest.findFirst({
      where: { id, company: { client: { officeId } } },
      include: { ...documentInclude, aiAnalyses: true, unmatchedDocuments: true }
    });
    if (!doc) return reply.code(404).send({ error: 'Not found' });
    return doc;
  });
};

export default documentsRoutes;
