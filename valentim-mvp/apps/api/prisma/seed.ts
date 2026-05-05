import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  const office = await prisma.office.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Valentim Demo Office'
    }
  });
  const password = await hashPassword('Admin@123');
  await prisma.user.upsert({
    where: { email: 'admin@valentim.local' },
    update: {},
    create: {
      officeId: office.id,
      role: 'ADMIN',
      name: 'Admin',
      email: 'admin@valentim.local',
      password
    }
  });
  const client = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      officeId: office.id,
      name: 'Padaria do João',
      phone: '5521999999999'
    }
  });
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      clientId: client.id,
      name: 'Padaria do João LTDA',
      cnpj: '12.345.678/0001-90',
      regime: 'Simples Nacional'
    }
  });
  await prisma.documentRequest.createMany({
    data: [
      {
        companyId: company.id,
        documentType: 'DAS',
        competence: '04/2026',
        dueDate: new Date('2026-05-20'),
        status: 'PENDING'
      },
      {
        companyId: company.id,
        documentType: 'EXTRATO',
        competence: '04/2026',
        dueDate: new Date('2026-05-20'),
        status: 'PENDING'
      }
    ],
    skipDuplicates: true
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
