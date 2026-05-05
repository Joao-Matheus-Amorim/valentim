import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { FastifyRequest, FastifyReply } from 'fastify';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as any;
}

export function authMiddleware(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const authHeader = request.headers['authorization'];
  if (!authHeader) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  const parts = (authHeader as string).split(' ');
  const token = parts[1];
  try {
    const decoded = verifyToken(token);
    (request as any).user = decoded;
    done();
  } catch (err) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
}
