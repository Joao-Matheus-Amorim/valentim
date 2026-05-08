const financeRoutes = async (app: any) => {
  const { prisma } = await import('../lib/prisma');
  const { authMiddleware } = await import('../lib/auth');
  const { getIdParam } = await import('../lib/http');
  const { hasPaginationQuery, normalizePagination, paginationQuerySchema } = await import('../lib/pagination');

  function cleanText(value: unknown) {
    if (typeof value !== 'string') return '';
    return value.trim();
  }

  function optionalText(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  function toNumber(value: unknown) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value.replace(',', '.'));
    return Number.NaN;
  }

  app.get('/api/charges', { preHandler: authMiddleware }, async (request: any, reply: any) => {
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
      ...(search ? { description: { contains: search, mode: 'insensitive' as const } } : {})
    };

    const [charges, total] = await Promise.all([
      prisma.charge.findMany({
        where,
        include: { company: true },
        orderBy: { dueDate: 'asc' },
        ...(hasPaginationQuery(request.query) ? { skip, take: limit } : {})
      }),
      hasPaginationQuery(request.query) ? prisma.charge.count({ where }) : Promise.resolve(0)
    ]);

    if (!hasPaginationQuery(request.query)) return charges;
    return { data: charges, total, page, limit };
  });

  app.post('/api/charges', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const { officeId } = request.user;
    const body = request.body as any;
    const companyId = cleanText(body?.companyId);
    const description = cleanText(body?.description);
    const amount = toNumber(body?.amount);
    const dueDate = cleanText(body?.dueDate);
    const status = optionalText(body?.status) ?? 'PENDING';

    if (!companyId) return reply.code(400).send({ error: 'Company is required' });
    if (!description) return reply.code(400).send({ error: 'Description is required' });
    if (!Number.isFinite(amount)) return reply.code(400).send({ error: 'Amount is invalid' });
    if (!dueDate || Number.isNaN(Date.parse(dueDate))) return reply.code(400).send({ error: 'Due date is invalid' });

    const company = await prisma.company.findFirst({ where: { id: companyId, client: { officeId } } });
    if (!company) return reply.code(400).send({ error: 'Invalid company' });

    return prisma.charge.create({
      data: { companyId, description, amount, dueDate: new Date(dueDate), status }
    });
  });

  app.put('/api/charges/:id', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const data = request.body as any;
    const existing = await prisma.charge.findFirst({ where: { id, company: { client: { officeId } } } });
    if (!existing) return reply.code(404).send({ error: 'Charge not found' });

    const nextAmount = data.amount !== undefined ? toNumber(data.amount) : existing.amount;
    if (data.amount !== undefined && !Number.isFinite(nextAmount)) return reply.code(400).send({ error: 'Amount is invalid' });

    const nextDueDate = data.dueDate ? new Date(data.dueDate) : existing.dueDate;
    if (data.dueDate && Number.isNaN(nextDueDate.getTime())) return reply.code(400).send({ error: 'Due date is invalid' });

    return prisma.charge.update({
      where: { id: existing.id },
      data: {
        description: data.description !== undefined ? cleanText(data.description) || existing.description : existing.description,
        amount: nextAmount,
        dueDate: nextDueDate,
        status: data.status !== undefined ? cleanText(data.status) || existing.status : existing.status
      }
    });
  });

  app.delete('/api/charges/:id', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const existing = await prisma.charge.findFirst({ where: { id, company: { client: { officeId } } } });
    if (!existing) return reply.code(404).send({ error: 'Charge not found' });
    await prisma.charge.delete({ where: { id } });
    return { deleted: true };
  });
};

export default financeRoutes;
