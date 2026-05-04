import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

const createClientSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["PERSON", "COMPANY"]).default("COMPANY"),
  cpfCnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "PROSPECT"]).optional(),
});

export async function clientsRoutes(app: FastifyInstance) {
  app.get("/api/clients", async (request) => {
    const auth = requireAuth(request);
    const query = request.query as Record<string, string | undefined>;
    const search = query.search?.trim();

    const clients = await prisma.client.findMany({
      where: {
        officeId: auth.officeId,
        ...(query.status ? { status: query.status as never } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { cpfCnpj: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        companies: true,
        _count: {
          select: {
            documentRequests: true,
            charges: true,
          },
        },
      },
    });

    return { total: clients.length, data: clients };
  });

  app.get("/api/clients/:id", async (request) => {
    const auth = requireAuth(request);
    const params = request.params as { id: string };

    const client = await prisma.client.findFirst({
      where: { id: params.id, officeId: auth.officeId },
      include: {
        companies: true,
        documentRequests: { orderBy: { createdAt: "desc" }, take: 20 },
        deadlines: { orderBy: { dueDate: "asc" }, take: 20 },
        charges: { orderBy: { dueDate: "desc" }, take: 20 },
        conversationStates: true,
      },
    });

    if (!client) {
      throw new HttpError(404, "Cliente não encontrado.");
    }

    return client;
  });

  app.post("/api/clients", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN", "STAFF"]);

    const parsed = createClientSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new HttpError(400, "Dados inválidos.", parsed.error.flatten());
    }

    const client = await prisma.client.create({
      data: {
        officeId: auth.officeId,
        name: parsed.data.name,
        type: parsed.data.type,
        cpfCnpj: parsed.data.cpfCnpj,
        phone: parsed.data.phone,
        email: parsed.data.email,
        notes: parsed.data.notes,
      },
    });

    await prisma.auditLog.create({ data: { officeId: auth.officeId, userId: auth.id, action: "CLIENT_CREATED", entity: "Client", entityId: client.id } });

    return client;
  });

  app.put("/api/clients/:id", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN", "STAFF"]);
    const params = request.params as { id: string };
    const parsed = updateClientSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new HttpError(400, "Dados inválidos.", parsed.error.flatten());
    }

    const existing = await prisma.client.findFirst({ where: { id: params.id, officeId: auth.officeId } });

    if (!existing) {
      throw new HttpError(404, "Cliente não encontrado.");
    }

    const client = await prisma.client.update({ where: { id: params.id }, data: parsed.data });

    await prisma.auditLog.create({ data: { officeId: auth.officeId, userId: auth.id, action: "CLIENT_UPDATED", entity: "Client", entityId: client.id } });

    return client;
  });

  app.delete("/api/clients/:id", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN"]);
    const params = request.params as { id: string };

    const existing = await prisma.client.findFirst({ where: { id: params.id, officeId: auth.officeId } });

    if (!existing) {
      throw new HttpError(404, "Cliente não encontrado.");
    }

    const client = await prisma.client.update({ where: { id: params.id }, data: { status: "INACTIVE" } });

    await prisma.auditLog.create({ data: { officeId: auth.officeId, userId: auth.id, action: "CLIENT_INACTIVATED", entity: "Client", entityId: client.id } });

    return client;
  });
}
