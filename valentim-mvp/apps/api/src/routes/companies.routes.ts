const companiesRoutes = async (app: any) => {
  const { prisma } = await import('../lib/prisma');
  const { authMiddleware } = await import('../lib/auth');
  const { getIdParam } = await import('../lib/http');

  app.get('/api/companies', { preHandler: authMiddleware }, async (request: any) => {
    const { officeId } = request.user;
    return prisma.company.findMany({
      where: { client: { officeId } },
      include: { client: true }
    });
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
};

export default companiesRoutes;
