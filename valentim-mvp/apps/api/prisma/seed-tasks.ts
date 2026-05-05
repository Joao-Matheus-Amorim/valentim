import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const office = await prisma.office.findFirst();
  const user = await prisma.user.findFirst();
  const client = await prisma.client.findFirst({ where: { officeId: office?.id } });
  const company = await prisma.company.findFirst({ where: { clientId: client?.id } });
  const documentRequest = await prisma.documentRequest.findFirst({ where: { companyId: company?.id } });

  if (!office) {
    throw new Error('No office found. Run the main seed first.');
  }

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      officeId: office.id,
      clientId: client?.id,
      companyId: company?.id,
      documentRequestId: documentRequest?.id,
      assignedToId: user?.id,
      title: 'Cobrar DAS de abril',
      description: 'Cliente ainda não enviou a guia DAS da competência atual.',
      status: 'WAITING_CLIENT',
      priority: 'URGENT',
      source: 'document',
      dueDate: new Date('2026-05-20')
    }
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      officeId: office.id,
      clientId: client?.id,
      companyId: company?.id,
      assignedToId: user?.id,
      title: 'Revisar documento analisado pela IA',
      description: 'Documento recebido precisa de validação humana antes de ser aprovado.',
      status: 'WAITING_REVIEW',
      priority: 'HIGH',
      source: 'ai',
      dueDate: new Date('2026-05-18')
    }
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0000-000000000103' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000103',
      officeId: office.id,
      clientId: client?.id,
      companyId: company?.id,
      title: 'Conferir cobrança mensal vencida',
      description: 'Verificar cobrança em aberto e preparar follow-up com o cliente.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      source: 'finance',
      dueDate: new Date('2026-05-10')
    }
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0000-000000000104' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000104',
      officeId: office.id,
      clientId: client?.id,
      title: 'Enviar proposta de consultoria tributária',
      description: 'Preparar proposta para serviço adicional de planejamento tributário.',
      status: 'PENDING',
      priority: 'MEDIUM',
      source: 'proposal',
      dueDate: new Date('2026-05-25')
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
