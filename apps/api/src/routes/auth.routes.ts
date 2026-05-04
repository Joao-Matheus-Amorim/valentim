import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, signToken } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (request) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new HttpError(400, "Dados de login inválidos.", parsed.error.flatten());
    }

    const user = await prisma.user.findFirst({
      where: {
        email: parsed.data.email,
        status: "ACTIVE",
      },
      include: {
        office: true,
      },
    });

    if (!user) {
      throw new HttpError(401, "E-mail ou senha inválidos.");
    }

    const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new HttpError(401, "E-mail ou senha inválidos.");
    }

    const token = signToken({
      id: user.id,
      officeId: user.officeId,
      role: user.role,
      email: user.email,
    });

    await prisma.auditLog.create({
      data: {
        officeId: user.officeId,
        userId: user.id,
        action: "USER_LOGIN",
        entity: "User",
        entityId: user.id,
      },
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        office: {
          id: user.office.id,
          name: user.office.name,
        },
      },
    };
  });

  app.get("/api/auth/me", async (request) => {
    const auth = requireAuth(request);
    const user = await prisma.user.findFirst({
      where: {
        id: auth.id,
        officeId: auth.officeId,
        status: "ACTIVE",
      },
      include: {
        office: true,
      },
    });

    if (!user) {
      throw new HttpError(401, "Usuário não encontrado ou inativo.");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      office: {
        id: user.office.id,
        name: user.office.name,
      },
    };
  });
}
