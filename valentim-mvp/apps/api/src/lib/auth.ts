import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedUser } from '../types/fastify';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthenticatedUser) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthenticatedUser {
  return jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
}

export function authMiddleware(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    reply.code(401).send({ error: 'Invalid authorization header' });
    return;
  }

  try {
    request.user = verifyToken(token);
    done();
  } catch {
    reply.code(401).send({ error: 'Invalid token' });
  }
}
