import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from './lib/prisma';

import authRoutes from './routes/auth.routes';
import clientsRoutes from './routes/clients.routes';
import companiesRoutes from './routes/companies.routes';
import peopleRoutes from './routes/people.routes';
import documentsRoutes from './routes/documents.routes';
import reviewRoutes from './routes/document-review.routes';
import deadlinesRoutes from './routes/deadlines.routes';
import financeRoutes from './routes/finance.routes';
import proposalsRoutes from './routes/proposals.routes';
import dashboardRoutes from './routes/dashboard.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import tasksRoutes from './routes/tasks.routes';

const allowedOrigins = [
  'http://localhost:5173',
  'https://valentim-swart.vercel.app'
];

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-secret']
  });

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
  app.register(peopleRoutes);
  app.register(documentsRoutes);
  app.register(reviewRoutes);
  app.register(deadlinesRoutes);
  app.register(financeRoutes);
  app.register(proposalsRoutes);
  app.register(whatsappRoutes);
  app.register(tasksRoutes);

  return app;
}
