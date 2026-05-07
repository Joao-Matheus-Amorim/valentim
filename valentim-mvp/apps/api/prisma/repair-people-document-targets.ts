import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const requiredPersonColumns = ['id', 'officeId', 'clientId', 'name', 'cpf', 'email', 'phone', 'role', 'createdAt', 'updatedAt'];
const requiredDocumentColumns = ['targetType', 'personId'];
const requiredTaskColumns = ['personId'];

async function getColumns(tableName: string) {
  const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = $1
    order by ordinal_position
  `, tableName);

  return columns.map((column) => column.column_name);
}

async function main() {
  const before = {
    person: await getColumns('Person'),
    documentRequest: await getColumns('DocumentRequest'),
    task: await getColumns('Task')
  };

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentTargetType') THEN
        CREATE TYPE "DocumentTargetType" AS ENUM ('COMPANY', 'PERSON');
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PersonRole') THEN
        CREATE TYPE "PersonRole" AS ENUM ('OWNER', 'PARTNER', 'LEGAL_REPRESENTATIVE', 'RESPONSIBLE', 'CONTACT', 'OTHER');
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Person" (
      "id" TEXT NOT NULL,
      "officeId" TEXT NOT NULL,
      "clientId" TEXT,
      "name" TEXT NOT NULL,
      "cpf" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "role" "PersonRole" NOT NULL DEFAULT 'OTHER',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DocumentRequest"
    ADD COLUMN IF NOT EXISTS "targetType" "DocumentTargetType" NOT NULL DEFAULT 'COMPANY'
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DocumentRequest"
    ADD COLUMN IF NOT EXISTS "personId" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Task"
    ADD COLUMN IF NOT EXISTS "personId" TEXT
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Person_officeId_idx" ON "Person"("officeId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Person_clientId_idx" ON "Person"("clientId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Person_role_idx" ON "Person"("role")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DocumentRequest_personId_idx" ON "DocumentRequest"("personId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DocumentRequest_targetType_idx" ON "DocumentRequest"("targetType")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_personId_idx" ON "Task"("personId")`);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Person_officeId_fkey') THEN
        ALTER TABLE "Person"
        ADD CONSTRAINT "Person_officeId_fkey"
        FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Person_clientId_fkey') THEN
        ALTER TABLE "Person"
        ADD CONSTRAINT "Person_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentRequest_personId_fkey') THEN
        ALTER TABLE "DocumentRequest"
        ADD CONSTRAINT "DocumentRequest_personId_fkey"
        FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_personId_fkey') THEN
        ALTER TABLE "Task"
        ADD CONSTRAINT "Task_personId_fkey"
        FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  const after = {
    person: await getColumns('Person'),
    documentRequest: await getColumns('DocumentRequest'),
    task: await getColumns('Task')
  };

  const missing = {
    person: requiredPersonColumns.filter((column) => !after.person.includes(column)),
    documentRequest: requiredDocumentColumns.filter((column) => !after.documentRequest.includes(column)),
    task: requiredTaskColumns.filter((column) => !after.task.includes(column))
  };

  const repaired = missing.person.length === 0 && missing.documentRequest.length === 0 && missing.task.length === 0;

  console.log(JSON.stringify({ repaired, before, after, missing }, null, 2));

  if (!repaired) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
