import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { analyzeDocument } from '../lib/ai';
import { env } from '../lib/env';

const whatsappRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/webhooks/whatsapp', async (request, reply) => {
    const incoming = request.headers['x-webhook-secret'];
    if (incoming !== env.WEBHOOK_SECRET) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const payload = request.body as any;

    const office = await prisma.office.findFirst();
    if (!office) {
      return reply.code(500).send({ error: 'Office not configured' });
    }

    let client = null;
    if (payload.phone) {
      client = await prisma.client.findFirst({
        where: { phone: payload.phone, officeId: office.id }
      });
    }

    await prisma.whatsAppMessage.create({
      data: {
        officeId: office.id,
        clientId: client?.id ?? null,
        providerMessageId: payload.providerMessageId || '',
        phone: payload.phone || '',
        direction: 'INCOMING',
        messageType: payload.messageType || 'TEXT',
        body: payload.body ?? null,
        mediaUrl: payload.mediaUrl ?? null,
        mediaKey: null
      }
    });

    if (payload.messageType === 'DOCUMENT' && payload.fileName) {
      const ai = analyzeDocument(payload.fileName, payload.mimeType);

      let docRequest = null;
      if (client) {
        docRequest = await prisma.documentRequest.findFirst({
          where: {
            company: { clientId: client.id },
            documentType: ai.documentType,
            status: 'PENDING'
          },
          orderBy: { createdAt: 'asc' }
        });
      }

      const fileRecord = await prisma.documentFile.create({
        data: {
          documentRequestId: docRequest?.id ?? null,
          filename: payload.fileName,
          mimeType: payload.mimeType,
          storageKey: payload.mediaUrl || ''
        }
      });

      await prisma.aIAnalysis.create({
        data: {
          documentFileId: fileRecord.id,
          documentRequestId: docRequest?.id ?? null,
          documentType: ai.documentType,
          competence: ai.competence ?? null,
          cnpj: ai.cnpj ?? null,
          totalValue: ai.totalValue ?? null,
          confidence: ai.confidence,
          summary: ai.summary ?? null,
          flags: ai.flags,
          model: ai.model
        }
      });

      if (docRequest) {
        await prisma.documentRequest.update({
          where: { id: docRequest.id },
          data: { status: 'SENT' }
        });
      }
    }

    return { received: true };
  });
};

export default whatsappRoutes;
