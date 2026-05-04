import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function ensureDocumentRequest(input: {
  officeId: string;
  clientId: string;
  companyId: string;
  requestedById: string;
  title: string;
  documentType: "DAS_PAGO" | "EXTRATO_BANCARIO";
  referenceMonth: number;
  referenceYear: number;
  dueDate: Date;
}) {
  const existing = await prisma.documentRequest.findFirst({
    where: {
      officeId: input.officeId,
      clientId: input.clientId,
      companyId: input.companyId,
      documentType: input.documentType,
      referenceMonth: input.referenceMonth,
      referenceYear: input.referenceYear,
    },
  });

  if (existing) {
    return prisma.documentRequest.update({
      where: {
        id: existing.id,
      },
      data: {
        title: input.title,
        dueDate: input.dueDate,
        requestedById: input.requestedById,
      },
    });
  }

  return prisma.documentRequest.create({
    data: {
      officeId: input.officeId,
      clientId: input.clientId,
      companyId: input.companyId,
      title: input.title,
      documentType: input.documentType,
      referenceMonth: input.referenceMonth,
      referenceYear: input.referenceYear,
      dueDate: input.dueDate,
      status: "PENDING",
      requestedById: input.requestedById,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 10);

  const office = await prisma.office.upsert({
    where: {
      cnpj: "00.000.000/0001-00",
    },
    update: {
      name: "Escritório Valentim Demo",
      email: "contato@valentim.local",
      phone: "5521999999999",
    },
    create: {
      name: "Escritório Valentim Demo",
      cnpj: "00.000.000/0001-00",
      email: "contato@valentim.local",
      phone: "5521999999999",
    },
  });

  const admin = await prisma.user.upsert({
    where: {
      officeId_email: {
        officeId: office.id,
        email: "admin@valentim.local",
      },
    },
    update: {
      name: "Administrador Valentim",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      officeId: office.id,
      name: "Administrador Valentim",
      email: "admin@valentim.local",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const client = await prisma.client.upsert({
    where: {
      officeId_cpfCnpj: {
        officeId: office.id,
        cpfCnpj: "12.345.678/0001-90",
      },
    },
    update: {
      name: "Padaria do João",
      phone: "5521999999999",
      email: "joao@padaria.local",
      internalResponsibleId: admin.id,
      status: "ACTIVE",
    },
    create: {
      officeId: office.id,
      internalResponsibleId: admin.id,
      name: "Padaria do João",
      type: "COMPANY",
      cpfCnpj: "12.345.678/0001-90",
      phone: "5521999999999",
      email: "joao@padaria.local",
      status: "ACTIVE",
      notes: "Cliente demo para testes do fluxo WhatsApp-first.",
    },
  });

  const company = await prisma.company.upsert({
    where: {
      officeId_cnpj: {
        officeId: office.id,
        cnpj: "12.345.678/0001-90",
      },
    },
    update: {
      clientId: client.id,
      legalName: "Padaria do João LTDA",
      tradeName: "Padaria do João",
      taxRegime: "SIMPLES_NACIONAL",
      city: "Magé",
      state: "RJ",
      status: "ACTIVE",
    },
    create: {
      officeId: office.id,
      clientId: client.id,
      legalName: "Padaria do João LTDA",
      tradeName: "Padaria do João",
      cnpj: "12.345.678/0001-90",
      taxRegime: "SIMPLES_NACIONAL",
      city: "Magé",
      state: "RJ",
      status: "ACTIVE",
    },
  });

  await ensureDocumentRequest({
    officeId: office.id,
    clientId: client.id,
    companyId: company.id,
    requestedById: admin.id,
    title: "DAS Simples Nacional — Abril/2026",
    documentType: "DAS_PAGO",
    referenceMonth: 4,
    referenceYear: 2026,
    dueDate: new Date("2026-05-20T03:00:00.000Z"),
  });

  await ensureDocumentRequest({
    officeId: office.id,
    clientId: client.id,
    companyId: company.id,
    requestedById: admin.id,
    title: "Extrato bancário — Abril/2026",
    documentType: "EXTRATO_BANCARIO",
    referenceMonth: 4,
    referenceYear: 2026,
    dueDate: new Date("2026-05-10T03:00:00.000Z"),
  });

  await prisma.conversationState.upsert({
    where: {
      officeId_phone: {
        officeId: office.id,
        phone: "5521999999999",
      },
    },
    update: {
      clientId: client.id,
      companyId: company.id,
      state: "WAITING_DOC",
      lastMessagePreview: "Aguardando documentos demo de abril/2026.",
    },
    create: {
      officeId: office.id,
      clientId: client.id,
      companyId: company.id,
      phone: "5521999999999",
      state: "WAITING_DOC",
      lastMessagePreview: "Aguardando documentos demo de abril/2026.",
    },
  });

  await prisma.auditLog.create({
    data: {
      officeId: office.id,
      userId: admin.id,
      action: "SEED_COMPLETED",
      entity: "Office",
      entityId: office.id,
      metadata: {
        adminEmail: "admin@valentim.local",
        demoClientPhone: "5521999999999",
      },
    },
  });

  console.log("Seed concluído com sucesso.");
  console.log("Login demo: admin@valentim.local / Admin@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
