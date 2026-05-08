const proposalsRoutes = async (app: any) => {
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

  app.get('/api/proposals', { preHandler: authMiddleware }, async (request: any, reply: any) => {
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
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {})
    };

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        include: { client: true },
        orderBy: { createdAt: 'desc' },
        ...(hasPaginationQuery(request.query) ? { skip, take: limit } : {})
      }),
      hasPaginationQuery(request.query) ? prisma.proposal.count({ where }) : Promise.resolve(0)
    ]);

    if (!hasPaginationQuery(request.query)) return proposals;
    return { data: proposals, total, page, limit };
  });

  app.post('/api/proposals', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const { officeId } = request.user;
    const body = request.body as any;
    const clientId = cleanText(body?.clientId);
    const title = cleanText(body?.title);
    const description = cleanText(body?.description);
    const value = toNumber(body?.value);
    const status = optionalText(body?.status) ?? 'PENDING';

    if (!clientId) return reply.code(400).send({ error: 'Client is required' });
    if (!title) return reply.code(400).send({ error: 'Title is required' });
    if (!description) return reply.code(400).send({ error: 'Description is required' });
    if (!Number.isFinite(value)) return reply.code(400).send({ error: 'Value is invalid' });

    const client = await prisma.client.findFirst({ where: { id: clientId, officeId } });
    if (!client) return reply.code(400).send({ error: 'Invalid client' });

    return prisma.proposal.create({
      data: { clientId, title, description, value, status }
    });
  });

  app.put('/api/proposals/:id', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const data = request.body as any;
    const existing = await prisma.proposal.findFirst({ where: { id, client: { officeId } } });
    if (!existing) return reply.code(404).send({ error: 'Proposal not found' });

    const nextValue = data.value !== undefined ? toNumber(data.value) : existing.value;
    if (data.value !== undefined && !Number.isFinite(nextValue)) return reply.code(400).send({ error: 'Value is invalid' });

    return prisma.proposal.update({
      where: { id: existing.id },
      data: {
        title: data.title !== undefined ? cleanText(data.title) || existing.title : existing.title,
        description: data.description !== undefined ? cleanText(data.description) || existing.description : existing.description,
        value: nextValue,
        status: data.status !== undefined ? cleanText(data.status) || existing.status : existing.status
      }
    });
  });

  app.delete('/api/proposals/:id', { preHandler: authMiddleware }, async (request: any, reply: any) => {
    const id = getIdParam(request.params, reply);
    if (!id) return;

    const { officeId } = request.user;
    const existing = await prisma.proposal.findFirst({ where: { id, client: { officeId } } });
    if (!existing) return reply.code(404).send({ error: 'Proposal not found' });
    await prisma.proposal.delete({ where: { id } });
    return { deleted: true };
  });
};

export default proposalsRoutes;
