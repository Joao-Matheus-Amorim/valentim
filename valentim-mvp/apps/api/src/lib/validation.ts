import { FastifyReply } from 'fastify';
import { z } from 'zod';

export const nonEmptyString = z.string().trim().min(1);

export const optionalNullableString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().min(1).nullable().optional()
);

export const optionalNullableDateString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date').nullable().optional()
);

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
  reply: FastifyReply
): z.infer<T> | null {
  const result = schema.safeParse(body);

  if (!result.success) {
    reply.code(400).send({
      error: 'Invalid request body',
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
    return null;
  }

  return result.data;
}
