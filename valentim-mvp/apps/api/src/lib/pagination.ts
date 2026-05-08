import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).optional()
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PaginationOptions = {
  page?: number;
  limit?: number;
  search?: string;
};

export type PrismaPaginationOptions = {
  skip?: number;
  take?: number;
  search?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export function normalizePagination(options?: PaginationOptions) {
  const page = options?.page && options.page > 0 ? options.page : 1;
  const limit = options?.limit && options.limit > 0 ? options.limit : 20;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    search: options?.search?.trim() || undefined
  };
}

export function hasPaginationQuery(query: unknown) {
  if (!query || typeof query !== 'object') return false;
  const value = query as Record<string, unknown>;
  return value.page !== undefined || value.limit !== undefined || value.search !== undefined;
}
