import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

const companySchema = z.object({
  clientId: z.string().uuid(),
  legalName: z.string().min(2),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  stateRegistration: z.string().optional(),
  municipalRegistration: z.string().optional(),
  taxRegime: z.enum(["MEI", "SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL", "PESSOA_FISICA", "OUTRO"]).default("OUTRO"),
  mainActivity: z.string().optional(),
  cnae: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  certificateExpiresAt: z.string().datetime().optional(),
});

export async function companiesRoutes(app: FastifyInstance) {
  app.get("/api/companies", async (request) => {
    const auth = requireAuth(request);
    const query = request.query as Record<string, string | undefined>;

    const companies = await prisma.company.findMany({
      where: {
        officeId: auth.officeId,
        clientId: query.clientId,
        status: query.status as never,
      },
      orderBy: { createdAt: "desc" },
      include: { client: true },
    });

    return { total: companies.length, data: companies };
  });

  app.post("/api/companies", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN", "STAFF"]);
    const parsed = companySchema.safeParse(request.body);

    if (!parsed.success) {
      throw new HttpError(400, "Dados inválidos.", parsed.error.flatten());
    }

    const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, officeId: auth.officeId } });

    if (!client) {
      throw new HttpError(404, "Cliente não encontrado.");
    }

    const company = await prisma.company.create({
      data: {
        officeId: auth.officeId,
        clientId: parsed.data.clientId,
        legalName: parsed.data.legalName,
        tradeName: parsed.data.tradeName,
        cnpj: parsed.data.cnpj,
        stateRegistration: parsed.data.stateRegistration,
        municipalRegistration: parsed.data.municipalRegistration,
        taxRegime: parsed.data.taxRegime,
        mainActivity: parsed.data.mainActivity,
        cnae: parsed.data.cnae,
        city: parsed.data.city,
        state: parsed.data.state,
        certificateExpiresAt: parsed.data.certificateExpiresAt ? new Date(parsed.data.certificateExpiresAt) : undefined,
      },
    });

    await prisma.auditLog.create({ data: { officeId: auth.officeId, userId: auth.id, action: "COMPANY_CREATED", entity: "Company", entityId: company.id } });

    return company;
  });

  app.put("/api/companies/:id", async (request) => {
    const auth = requireAuth(request);
    requireRole(auth, ["ADMIN", "STAFF"]);
    const params = request.params as { id: string };
    const parsed = companySchema.partial().extend({ status: z.enum(["ACTIVE", "INACTIVE"]).optional() }).safeParse(request.body);

    if (!parsed.success) {
      throw new HttpError(400, "Dados inválidos.", parsed.error.flatten());
    }

    const existing = await prisma.company.findFirst({ where: { id: params.id, officeId: auth.officeId } });

    if (!existing) {
      throw new HttpError(404, "Empresa não encontrada.");
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        certificateExpiresAt: parsed.data.certificateExpiresAt ? new Date(parsed.data.certificateExpiresAt) : undefined,
      },
    });

    await prisma.auditLog.create({ data: { officeId: auth.officeId, userId: auth.id, action: "COMPANY_UPDATED", entity: "Company", entityId: company.id } });

    return company;
  });
}
