import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard/summary", async (request) => {
    const auth = requireAuth(request);
    const now = new Date();
    const nextSevenDays = new Date(now);
    nextSevenDays.setDate(now.getDate() + 7);

    const [
      activeClients,
      activeCompanies,
      pendingDocuments,
      sentDocuments,
      approvedDocuments,
      upcomingDeadlines,
      overdueDeadlines,
      openCharges,
      whatsappMessages,
      unmatchedDocuments,
    ] = await Promise.all([
      prisma.client.count({ where: { officeId: auth.officeId, status: "ACTIVE" } }),
      prisma.company.count({ where: { officeId: auth.officeId, status: "ACTIVE" } }),
      prisma.documentRequest.count({ where: { officeId: auth.officeId, status: { in: ["PENDING", "REJECTED", "OVERDUE"] } } }),
      prisma.documentRequest.count({ where: { officeId: auth.officeId, status: { in: ["SENT", "UNDER_REVIEW"] } } }),
      prisma.documentRequest.count({ where: { officeId: auth.officeId, status: "APPROVED" } }),
      prisma.deadline.count({ where: { officeId: auth.officeId, status: "OPEN", dueDate: { gte: now, lte: nextSevenDays } } }),
      prisma.deadline.count({ where: { officeId: auth.officeId, status: "OVERDUE" } }),
      prisma.charge.aggregate({ where: { officeId: auth.officeId, status: { in: ["OPEN", "OVERDUE"] } }, _sum: { amount: true } }),
      prisma.whatsAppMessage.count({ where: { officeId: auth.officeId } }),
      prisma.unmatchedDocument.count({ where: { officeId: auth.officeId, triageStatus: "PENDING" } }),
    ]);

    return {
      activeClients,
      activeCompanies,
      pendingDocuments,
      sentDocuments,
      approvedDocuments,
      upcomingDeadlines,
      overdueDeadlines,
      openChargesAmount: openCharges._sum.amount ?? 0,
      whatsappMessages,
      unmatchedDocuments,
    };
  });
}
