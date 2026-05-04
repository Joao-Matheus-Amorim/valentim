import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

const documentTypes = [
  "NOTAS_ENTRADA",
  "NOTAS_SAIDA",
  "EXTRATO_BANCARIO",
  "COMPROVANTES_DESPESAS",
  "FOLHA_PAGAMENTO",
  "PRO_LABORE",
  "CONTRATOS",
  "XML",
  "DAS_PAGO",
  "DARF_PAGO",
  "RECIBOS",
  "OUTROS",
] as const;

const documentRequestSchema = z.object({
  clientId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  title: z.string().min(2),
  documentType: z.enum(documentTypes),
  referenceMonth: z.number().int().min(1).max(12),
  referenceYear: z.number().int().min(2020).max(2100),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function documentsRoutes(app: FastifyInstance) {
  app.get("/api/documents/requests", async (request) => {
    const auth = requireAuth(request);
    const query = request.query as Record<string, string | undefined>;

    const items = await prisma.documentRequest.findMany({
      where: {
        officeId: auth.officeId,
        clientId: query.clientId,
        companyId: query.companyId,
        status: query.status as never,
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        company: true,
        files: {
          include: {
            aiAnalyses: true,
          },
        },
      },
    });

    return { total: items.length, data: items };
  });

  app.post("/api/documents/requests", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN", "STAFF"]);
    const parsed = documentRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new HttpError(400, "Dados inválidos.", parsed.error.flatten());
    }

    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, officeId: auth.officeId },
    });

    if (!client) {
      throw new HttpError(404, "Cliente não encontrado.");
    }

    if (parsed.data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: parsed.data.companyId, officeId: auth.officeId, clientId: parsed.data.clientId },
      });

      if (!company) {
        throw new HttpError(404, "Empresa não encontrada para este cliente.");
      }
    }

    const item = await prisma.documentRequest.create({
      data: {
        officeId: auth.officeId,
        clientId: parsed.data.clientId,
        companyId: parsed.data.companyId,
        title: parsed.data.title,
        documentType: parsed.data.documentType,
        referenceMonth: parsed.data.referenceMonth,
        referenceYear: parsed.data.referenceYear,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        notes: parsed.data.notes,
        requestedById: auth.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        officeId: auth.officeId,
        userId: auth.id,
        action: "DOCUMENT_REQUEST_CREATED",
        entity: "DocumentRequest",
        entityId: item.id,
      },
    });

    return item;
  });
}
