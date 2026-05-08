const companiesRoutes = async (app: any) => {
  const { z } = await import('zod');
  const { prisma } = await import('../lib/prisma');
  const { authMiddleware } = await import('../lib/auth');
  const { getIdParam } = await import('../lib/http');
  const { nonEmptyString, optionalNullableString, parseBody } = await import('../lib/validation');
  const { hasPaginationQuery, normalizePagination, paginationQuerySchema } = await import('../lib/pagination');

  const createCompanyBodySchema = z.object({
    clientId: z.string().uuid(),
    name: nonEmptyString,
    cnpj: optionalNullableString,
    regime: optionalNullableString
  });

  const updateCompanyBodySchema = z.object({
    name: nonEmptyString.optional(),
    cnpj: optionalNullableString,
    regime: optionalNullableString
  }).refine((data: any) => Object.keys(data).length > 0, 'At least one field is required');

  app.get('/api/companies', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const query = paginationQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        error: 'Invalid query parameters',
        issues: query.error.issues.map((issue: any) => ({ path: issue.path.join('.'), message: issue.message }))
      });
    }

    const { officeId } = request.user;
    const { page, limit, skip, search } = normalizePagination(query.data);
    const where = {
      client: { officeId },
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {})
    };

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: { client: true },
        orderBy: { createdAt: 'desc' },
        ...(hasPaginationQuery(request.query) ? { skip, take: limit } : {})
      }),
      hasPaginationQuery(request.query) ? prisma.company.count({ where }) : Promise.resolve(0)
    ]);

    if (!hasPaginationQuery(request.query)) return companies;
    return { data: companies, total, page, limit };
  });

  app.get('/api/companies/:id', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const company = await prisma.company.findFirst({
      where: { id, client: { officeId } },
      include: { client: true, documentRequests: true, deadlines: true, charges: true }
    });
    if (!company) return reply.code(404).send({ error: 'Company not found' });
    return company;
  });

  app.post('/api/companies', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const body = parseBody(createCompanyBodySchema, request.body, reply);
    if (!body) return;

    const { officeId } = request.user;
    const client = await prisma.client.findFirst({ where: { id: body.clientId, officeId } });
    if (!client) return reply.code(400).send({ error: 'Invalid client' });
    return prisma.company.create({
      data: {
        clientId: body.clientId,
        name: body.name,
        cnpj: body.cnpj ?? null,
        regime: body.regime ?? null
      }
    });
  });

  app.put('/api/companies/:id', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const body = parseBody(updateCompanyBodySchema, request.body, reply);
    if (!body) return;

    const { officeId } = request.user;
    const existing = await prisma.company.findFirst({ where: { id, client: { officeId } } });
    if (!existing) return reply.code(404).send({ error: 'Company not found' });

    return prisma.company.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? existing.name,
        cnpj: body.cnpj !== undefined ? body.cnpj : existing.cnpj,
        regime: body.regime !== undefined ? body.regime : existing.regime
      }
    });
  });

  app.delete('/api/companies/:id', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const existing = await prisma.company.findFirst({ where: { id, client: { officeId } } });
    if (!existing) return reply.code(404).send({ error: 'Company not found' });
    await prisma.company.delete({ where: { id } });
    return { deleted: true };
  });
};

export default companiesRoutes;
