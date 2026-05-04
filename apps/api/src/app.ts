import cors from "@fastify/cors";
import Fastify from "fastify";
import type { WhatsAppNormalizedMessage } from "@valentim/shared";

const mockMessages: WhatsAppNormalizedMessage[] = [];

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "valentim-api",
      mode: "whatsapp-first",
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
    return {
      total: mockMessages.length,
      data: mockMessages,
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

    const message: WhatsAppNormalizedMessage = {
      provider: "mock",
      providerMessageId: String(body.providerMessageId ?? `mock-${Date.now()}`),
      phone: String(body.phone ?? "5521999999999"),
      direction: "INBOUND",
      messageType: String(body.messageType ?? "DOCUMENT") as WhatsAppNormalizedMessage["messageType"],
      body: typeof body.body === "string" ? body.body : undefined,
      mediaId: typeof body.mediaId === "string" ? body.mediaId : undefined,
      mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : undefined,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
      fileName: typeof body.fileName === "string" ? body.fileName : undefined,
      receivedAt: new Date().toISOString(),
      rawPayload: body,
    };

    mockMessages.unshift(message);

    return reply.code(202).send({
      accepted: true,
      queued: true,
      message,
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
