import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';
import { comparePassword, signToken, authMiddleware } from '../lib/auth';

const LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getLoginRateLimitKey(request: FastifyRequest) {
  return request.ip || request.headers['x-forwarded-for']?.toString() || 'unknown';
}

function checkLoginRateLimit(request: FastifyRequest, reply: FastifyReply) {
  const now = Date.now();
  const key = getLoginRateLimitKey(request);
  const current = loginAttempts.get(key);

  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    reply.header('Retry-After', String(retryAfterSeconds));
    reply.code(429).send({ error: 'Too many login attempts. Try again later.' });
    return false;
  }

  current.count += 1;
  loginAttempts.set(key, current);
  return true;
}

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/auth/login', async (request, reply) => {
    if (!checkLoginRateLimit(request, reply)) return;

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
    const { userId } = request.user;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, officeId: true } });

    if (!user) {
      return reply.code(401).send({ error: 'User no longer exists' });
    }

    return { user };
  });
};

export default authRoutes;
