import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

export async function documentReviewRoutes(app: FastifyInstance) {
  app.put("/api/documents/requests/:id/status", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN", "STAFF"]);
    const params = request.params as { id: string };
    const parsed = z
      .object({
        status: z.enum(["PENDING", "SENT", "UNDER_REVIEW", "APPROVED", "REJECTED", "OVERDUE"]),
        rejectionReason: z.string().optional(),
      })
      .safeParse(request.body);

    if (!parsed.success) {
      throw new HttpError(400, "Dados inválidos.", parsed.error.flatten());
    }

    const existing = await prisma.documentRequest.findFirst({
      where: { id: params.id, officeId: auth.officeId },
    });

    if (!existing) {
      throw new HttpError(404, "Solicitação não encontrada.");
    }

    const item = await prisma.documentRequest.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status,
        rejectionReason: parsed.data.rejectionReason,
        reviewedById: ["APPROVED", "REJECTED", "UNDER_REVIEW"].includes(parsed.data.status) ? auth.id : undefined,
        reviewedAt: ["APPROVED", "REJECTED"].includes(parsed.data.status) ? new Date() : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        officeId: auth.officeId,
        userId: auth.id,
        action: `DOCUMENT_${parsed.data.status}`,
        entity: "DocumentRequest",
        entityId: item.id,
      },
    });

    return item;
  });

  app.get("/api/unmatched-documents", async (request) => {
    const auth = requireAuth(request);
    const query = request.query as Record<string, string | undefined>;

    const items = await prisma.unmatchedDocument.findMany({
      where: {
        officeId: auth.officeId,
        triageStatus: query.status as never,
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        company: true,
        aiAnalysis: true,
        whatsAppMessage: true,
        documentFile: true,
      },
    });

    return { total: items.length, data: items };
  });

  app.post("/api/unmatched-documents/:id/assign", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN", "STAFF"]);
    const params = request.params as { id: string };
    const parsed = z.object({ documentRequestId: z.string().uuid(), staffNote: z.string().optional() }).safeParse(request.body);

    if (!parsed.success) {
      throw new HttpError(400, "Dados inválidos.", parsed.error.flatten());
    }

    const item = await prisma.unmatchedDocument.findFirst({
      where: { id: params.id, officeId: auth.officeId },
      include: { documentFile: true },
    });

    if (!item) {
      throw new HttpError(404, "Item de triagem não encontrado.");
    }

    const requestDoc = await prisma.documentRequest.findFirst({
      where: { id: parsed.data.documentRequestId, officeId: auth.officeId },
    });

    if (!requestDoc) {
      throw new HttpError(404, "Solicitação de documento não encontrada.");
    }

    if (item.documentFileId) {
      await prisma.documentFile.update({
        where: { id: item.documentFileId },
        data: { documentRequestId: requestDoc.id },
      });
    }

    await prisma.documentRequest.update({
      where: { id: requestDoc.id },
      data: { status: "UNDER_REVIEW" },
    });

    const updated = await prisma.unmatchedDocument.update({
      where: { id: item.id },
      data: {
        documentRequestId: requestDoc.id,
        triageStatus: "RESOLVED",
        resolvedById: auth.id,
        resolvedAt: new Date(),
        staffNote: parsed.data.staffNote,
      },
    });

    await prisma.auditLog.create({
      data: {
        officeId: auth.officeId,
        userId: auth.id,
        action: "UNMATCHED_DOCUMENT_ASSIGNED",
        entity: "UnmatchedDocument",
        entityId: updated.id,
        metadata: { documentRequestId: requestDoc.id },
      },
    });

    return updated;
  });
}
