import type { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { HttpError } from "./http-error.js";

export interface AuthUser {
  id: string;
  officeId: string;
  role: "ADMIN" | "STAFF" | "CLIENT";
  email: string;
}

export interface JwtPayload extends AuthUser {
  iat?: number;
  exp?: number;
}

const defaultJwtSecret = "dev-secret-change-me";

export function getJwtSecret() {
  return process.env.JWT_SECRET || defaultJwtSecret;
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export function verifyToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;

    return {
      id: payload.id,
      officeId: payload.officeId,
      role: payload.role,
      email: payload.email,
    };
  } catch {
    throw new HttpError(401, "Token inválido ou expirado.");
  }
}

export function getBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw new HttpError(401, "Token não informado.");
  }

  const [type, token] = authorization.split(" ");

  if (type !== "Bearer" || !token) {
    throw new HttpError(401, "Formato de token inválido. Use Authorization: Bearer <token>.");
  }

  return token;
}

export function requireAuth(request: FastifyRequest) {
  const token = getBearerToken(request);
  return verifyToken(token);
}

export function requireRole(user: AuthUser, allowed: AuthUser["role"][]) {
  if (!allowed.includes(user.role)) {
    throw new HttpError(403, "Você não tem permissão para executar esta ação.");
  }
}
