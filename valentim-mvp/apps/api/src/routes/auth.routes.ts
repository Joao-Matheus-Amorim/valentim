import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { comparePassword, signToken, authMiddleware } from '../lib/auth';

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    const token = signToken({ userId: user.id, officeId: user.officeId, role: user.role });
    return { token };
  });

  app.get('/api/auth/me', { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = (request as any).user;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, officeId: true } });
    return { user };
  });
};

export default authRoutes;
