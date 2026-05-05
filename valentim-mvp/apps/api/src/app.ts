import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from './lib/prisma';

import authRoutes from './routes/auth.routes';
import clientsRoutes from './routes/clients.routes';
import companiesRoutes from './routes/companies.routes';
import documentsRoutes from './routes/documents.routes';
import reviewRoutes from './routes/document-review.routes';
import deadlinesRoutes from './routes/deadlines.routes';
import financeRoutes from './routes/finance.routes';
import proposalsRoutes from './routes/proposals.routes';
import dashboardRoutes from './routes/dashboard.routes';
import whatsappRoutes from './routes/whatsapp.routes';

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });
  app.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'valentim-api', mode: 'whatsapp-first', database: 'connected' };
    } catch (err) {
      return { status: 'error', database: 'disconnected' };
    }
  });
  app.register(authRoutes);
  app.register(dashboardRoutes);
  app.register(clientsRoutes);
  app.register(companiesRoutes);
  app.register(documentsRoutes);
  app.register(reviewRoutes);
  app.register(deadlinesRoutes);
  app.register(financeRoutes);
  app.register(proposalsRoutes);
  app.register(whatsappRoutes);
  return app;
}
