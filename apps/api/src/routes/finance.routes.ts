import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

const createChargeSchema = z.object({
  clientId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  description: z.string().min(2),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
});

export async function financeRoutes(app: FastifyInstance) {
  app.get("/api/charges", async (request) => {
    const auth = requireAuth(request);
    const query = request.query as Record<string, string | undefined>;

    const items = await prisma.charge.findMany({
      where: {
        officeId: auth.officeId,
        clientId: query.clientId,
        companyId: query.companyId,
        status: query.status as never,
      },
      orderBy: { dueDate: "desc" },
      include: { client: true, company: true },
    });

    return { total: items.length, data: items };
  });

  app.post("/api/charges", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN"]);

    const parsed = createChargeSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Dados inválidos.", parsed.error.flatten());
    }

    const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, officeId: auth.officeId } });
    if (!client) {
      throw new HttpError(404, "Cliente não encontrado.");
    }

    const item = await prisma.charge.create({
      data: {
        officeId: auth.officeId,
        clientId: parsed.data.clientId,
        companyId: parsed.data.companyId,
        description: parsed.data.description,
        amount: parsed.data.amount,
        dueDate: new Date(parsed.data.dueDate),
        notes: parsed.data.notes,
      },
    });

    await prisma.auditLog.create({ data: { officeId: auth.officeId, userId: auth.id, action: "CHARGE_CREATED", entity: "Charge", entityId: item.id } });
    return item;
  });

  app.post("/api/charges/:id/mark-paid", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN"]);
    const params = request.params as { id: string };

    const existing = await prisma.charge.findFirst({ where: { id: params.id, officeId: auth.officeId } });
    if (!existing) {
      throw new HttpError(404, "Cobrança não encontrada.");
    }

    const item = await prisma.charge.update({ where: { id: params.id }, data: { status: "PAID", paidAt: new Date() } });
    await prisma.auditLog.create({ data: { officeId: auth.officeId, userId: auth.id, action: "CHARGE_MARKED_AS_PAID", entity: "Charge", entityId: item.id } });
    return item;
  });
}
