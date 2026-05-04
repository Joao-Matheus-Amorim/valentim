import cors from "@fastify/cors";
import Fastify from "fastify";
import type { WhatsAppNormalizedMessage } from "@valentim/shared";
import { authRoutes } from "./routes/auth.routes.js";
import { clientsRoutes } from "./routes/clients.routes.js";
import { companiesRoutes } from "./routes/companies.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { documentReviewRoutes } from "./routes/document-review.routes.js";
import { documentsRoutes } from "./routes/documents.routes.js";
import { isHttpError } from "./lib/http-error.js";
import { prisma } from "./lib/prisma.js";

function normalizeMessageType(value: unknown): WhatsAppNormalizedMessage["messageType"] {
  const messageType = String(value ?? "DOCUMENT").toUpperCase();
  const allowed = ["TEXT", "IMAGE", "DOCUMENT", "AUDIO", "VIDEO", "STICKER", "UNKNOWN"];

  return allowed.includes(messageType) ? (messageType as WhatsAppNormalizedMessage["messageType"]) : "UNKNOWN";
}

async function findDefaultOffice() {
  const office = await prisma.office.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!office) {
    throw new Error("Nenhum escritório encontrado. Execute: pnpm --filter api prisma:seed");
  }

  return office;
}

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.setErrorHandler((error, _request, reply) => {
    if (isHttpError(error)) {
      return reply.code(error.statusCode).send({
        error: error.message,
        details: error.details,
      });
    }

    app.log.error(error);

    return reply.code(500).send({
      error: "Erro interno do servidor.",
    });
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(authRoutes);
  await app.register(dashboardRoutes);
  await app.register(clientsRoutes);
  await app.register(companiesRoutes);
  await app.register(documentsRoutes);
  await app.register(documentReviewRoutes);

  app.get("/health", async () => {
    const database = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;

    return {
      status: "ok",
      service: "valentim-api",
      mode: "whatsapp-first",
      database: database[0]?.ok === 1 ? "connected" : "unknown",
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/api/queues/health", async () => {
    return {
      status: "mocked",
      queue: "document-analysis",
      provider: "bullmq-future",
      pending: 0,
      processing: 0,
      failed: 0,
    };
  });

  app.get("/api/whatsapp/messages", async () => {
    const messages = await prisma.whatsAppMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        company: {
          select: {
            id: true,
            legalName: true,
            cnpj: true,
          },
        },
      },
    });

    return {
      total: messages.length,
      data: messages,
    };
  });

  app.get("/api/webhooks/whatsapp/verify", async (request) => {
    const query = request.query as Record<string, string | undefined>;

    return {
      verified: true,
      mode: query["hub.mode"] ?? "mock",
      challenge: query["hub.challenge"] ?? "valentim-webhook-ok",
    };
  });

  app.post("/api/webhooks/whatsapp", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const office = await findDefaultOffice();
    const phone = String(body.phone ?? "5521999999999");
    const providerMessageId = String(body.providerMessageId ?? `mock-${Date.now()}`);
    const messageType = normalizeMessageType(body.messageType);

    const client = await prisma.client.findFirst({
      where: {
        officeId: office.id,
        phone,
      },
      include: {
        companies: {
          where: {
            status: "ACTIVE",
          },
          take: 1,
        },
      },
    });

    const company = client?.companies[0];

    const message = await prisma.whatsAppMessage.upsert({
      where: {
        provider_providerMessageId: {
          provider: "MOCK",
          providerMessageId,
        },
      },
      update: {
        rawPayload: body,
        processingStatus: "QUEUED",
      },
      create: {
        officeId: office.id,
        clientId: client?.id,
        companyId: company?.id,
        provider: "MOCK",
        providerMessageId,
        phone,
        direction: "INBOUND",
        messageType,
        body: typeof body.body === "string" ? body.body : undefined,
        mediaId: typeof body.mediaId === "string" ? body.mediaId : undefined,
        mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : undefined,
        mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
        fileName: typeof body.fileName === "string" ? body.fileName : undefined,
        rawPayload: body,
        processed: false,
        processingStatus: "QUEUED",
      },
    });

    await prisma.conversationState.upsert({
      where: {
        officeId_phone: {
          officeId: office.id,
          phone,
        },
      },
      update: {
        clientId: client?.id,
        companyId: company?.id,
        state: "PROCESSING",
        lastInboundAt: new Date(),
        lastMessagePreview:
          typeof body.body === "string"
            ? body.body.slice(0, 180)
            : `${messageType} recebido${typeof body.fileName === "string" ? `: ${body.fileName}` : ""}`,
      },
      create: {
        officeId: office.id,
        clientId: client?.id,
        companyId: company?.id,
        phone,
        state: "PROCESSING",
        lastInboundAt: new Date(),
        lastMessagePreview:
          typeof body.body === "string"
            ? body.body.slice(0, 180)
            : `${messageType} recebido${typeof body.fileName === "string" ? `: ${body.fileName}` : ""}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        officeId: office.id,
        action: "WHATSAPP_MESSAGE_RECEIVED",
        entity: "WhatsAppMessage",
        entityId: message.id,
        metadata: {
          phone,
          providerMessageId,
          messageType,
          hasClientMatch: Boolean(client),
        },
      },
    });

    return reply.code(202).send({
      accepted: true,
      queued: true,
      persisted: true,
      message,
      clientMatch: client
        ? {
            id: client.id,
            name: client.name,
            companyId: company?.id ?? null,
          }
        : null,
      pipeline: [
        { id: "01", name: "RECEPCAO", status: "done" },
        { id: "02", name: "DOWNLOAD", status: "pending" },
        { id: "03", name: "AI_ANALISE", status: "pending" },
        { id: "04", name: "MATCHING", status: "pending" },
        { id: "05", name: "ARQUIVO", status: "pending" },
        { id: "06", name: "RESPOSTA", status: "pending" },
      ],
    });
  });

  return app;
}
