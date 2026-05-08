const deadlinesRoutes = async (app: any) => {
  const { z } = await import('zod');
  const { prisma } = await import('../lib/prisma');
  const { authMiddleware } = await import('../lib/auth');
  const { getIdParam } = await import('../lib/http');
  const { nonEmptyString, optionalNullableDateString, optionalNullableString, parseBody } = await import('../lib/validation');
  const { hasPaginationQuery, normalizePagination, paginationQuerySchema } = await import('../lib/pagination');

  const createDeadlineBodySchema = z.object({
    companyId: z.string().uuid(),
    name: nonEmptyString,
    dueDate: optionalNullableDateString,
    status: optionalNullableString
  });

  const updateDeadlineBodySchema = z.object({
    name: nonEmptyString.optional(),
    dueDate: optionalNullableDateString,
    status: optionalNullableString
  }).refine((data: any) => Object.keys(data).length > 0, 'At least one field is required');

  app.get('/api/deadlines', { preHandler: authMiddleware }, async (request: any, reply: any) => {
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
      company: { client: { officeId } },
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {})
    };

    const [deadlines, total] = await Promise.all([
      prisma.deadline.findMany({
        where,
        include: { company: true },
        orderBy: { dueDate: 'asc' },
        ...(hasPaginationQuery(request.query) ? { skip, take: limit } : {})
      }),
      hasPaginationQuery(request.query) ? prisma.deadline.count({ where }) : Promise.resolve(0)
    ]);

    if (!hasPaginationQuery(request.query)) return deadlines;
    return { data: deadlines, total, page, limit };
  });

  app.post('/api/deadlines', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const body = parseBody(createDeadlineBodySchema, request.body, reply);
    if (!body) return;

    const { officeId } = request.user;
    const company = await prisma.company.findFirst({ where: { id: body.companyId, client: { officeId } } });
    if (!company) return reply.code(400).send({ error: 'Invalid company' });

    const deadline = await prisma.deadline.create({
      data: {
        companyId: body.companyId,
        name: body.name,
        dueDate: body.dueDate ? new Date(body.dueDate) : new Date(),
        status: body.status ?? 'PENDING'
      }
    });
    return deadline;
  });

  app.put('/api/deadlines/:id', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const body = parseBody(updateDeadlineBodySchema, request.body, reply);
    if (!body) return;

    const { officeId } = request.user;
    const existing = await prisma.deadline.findFirst({
      where: { id, company: { client: { officeId } } }
    });
    if (!existing) return reply.code(404).send({ error: 'Deadline not found' });

    const updated = await prisma.deadline.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? existing.name,
        dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
        status: body.status ?? existing.status
      }
    });
    return updated;
  });

  app.delete('/api/deadlines/:id', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const existing = await prisma.deadline.findFirst({
      where: { id, company: { client: { officeId } } }
    });
    if (!existing) return reply.code(404).send({ error: 'Deadline not found' });
    await prisma.deadline.delete({ where: { id } });
    return { deleted: true };
  });
};

export default deadlinesRoutes;
