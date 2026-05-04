import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export async function prazosRoutes(app: FastifyInstance) {
  app.get("/api/deadlines", async (request) => {
    const auth = requireAuth(request);
    const items = await prisma.deadline.findMany({
      where: { officeId: auth.officeId },
      orderBy: { dueDate: "asc" },
      include: { client: true, company: true },
    });

    return { total: items.length, data: items };
  });
}
