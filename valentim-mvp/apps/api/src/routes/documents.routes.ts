import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { getIdParam } from '../lib/http';
import { nonEmptyString, optionalNullableDateString, optionalNullableString, parseBody } from '../lib/validation';

const createDocumentBodySchema = z.object({
  companyId: z.string().uuid(),
  documentType: nonEmptyString,
  competence: optionalNullableString,
  dueDate: optionalNullableDateString,
  targetType: z.enum(['COMPANY', 'PERSON']).optional(),
  personId: z.string().uuid().optional()
});

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
    const { officeId } = request.user;
    const documents = await prisma.documentRequest.findMany({
      where: { company: { client: { officeId } } },
      include: documentInclude
    });
    return documents;
  });

  app.post('/api/documents', { preHandler: authMiddleware }, async (request, reply) => {
    const body = parseBody(createDocumentBodySchema, request.body, reply);
    if (!body) return;

    const { officeId } = request.user;
    const normalizedTargetType = normalizeDocumentTargetType(body.targetType);

    const company = await prisma.company.findFirst({ where: { id: body.companyId, client: { officeId } } });
    if (!company) return reply.code(400).send({ error: 'Invalid company' });

    let normalizedPersonId: string | null = null;

    if (normalizedTargetType === 'PERSON') {
      if (!body.personId) return reply.code(400).send({ error: 'Person is required for personal document' });

      const person = await prisma.person.findFirst({
        where: {
          id: body.personId,
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
        companyId: body.companyId,
        targetType: normalizedTargetType as any,
        personId: normalizedPersonId,
        documentType: body.documentType,
        competence: body.competence ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null
      },
      include: documentInclude
    });

    return doc;
  });

  app.get('/api/documents/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const doc = await prisma.documentRequest.findFirst({
      where: { id, company: { client: { officeId } } },
      include: { ...documentInclude, aiAnalyses: true, unmatchedDocuments: true }
    });
    if (!doc) return reply.code(404).send({ error: 'Not found' });
    return doc;
  });
};

export default documentsRoutes;