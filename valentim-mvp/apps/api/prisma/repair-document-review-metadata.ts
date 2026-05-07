import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const requiredColumns = ['rejectionReason', 'reviewedAt', 'reviewedById'];

async function getDocumentRequestColumns() {
  const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'DocumentRequest'
    order by ordinal_position
  `);

  return columns.map((column) => column.column_name);
}

async function main() {
  const before = await getDocumentRequestColumns();

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DocumentRequest"
    ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DocumentRequest"
    ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DocumentRequest"
    ADD COLUMN IF NOT EXISTS "reviewedById" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DocumentRequest_reviewedById_idx"
    ON "DocumentRequest"("reviewedById")
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'DocumentRequest_reviewedById_fkey'
      ) THEN
        ALTER TABLE "DocumentRequest"
        ADD CONSTRAINT "DocumentRequest_reviewedById_fkey"
        FOREIGN KEY ("reviewedById")
        REFERENCES "User"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  const after = await getDocumentRequestColumns();
  const missingColumns = requiredColumns.filter((column) => !after.includes(column));

  console.log(JSON.stringify({
    repaired: missingColumns.length === 0,
    before,
    after,
    missingColumns
  }, null, 2));

  if (missingColumns.length > 0) {
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
