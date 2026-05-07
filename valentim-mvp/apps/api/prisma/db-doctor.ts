import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function maskDatabaseUrl(value?: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.password) url.password = '***';
    if (url.username) url.username = `${url.username.slice(0, 3)}***`;
    return url.toString();
  } catch {
    return value.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
  }
}

async function main() {
  const [connection] = await prisma.$queryRawUnsafe<Array<{
    database: string;
    schema: string;
    server: string | null;
    user: string;
  }>>(`
    select
      current_database() as database,
      current_schema() as schema,
      inet_server_addr()::text as server,
      current_user as user
  `);

  const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'DocumentRequest'
    order by ordinal_position
  `);

  const requiredColumns = ['rejectionReason', 'reviewedAt', 'reviewedById'];
  const existingColumns = columns.map((column) => column.column_name);
  const missingColumns = requiredColumns.filter((column) => !existingColumns.includes(column));

  console.log(JSON.stringify({
    environment: {
      databaseUrl: maskDatabaseUrl(process.env.DATABASE_URL),
      directUrl: maskDatabaseUrl(process.env.DIRECT_URL)
    },
    connection,
    documentRequest: {
      existingColumns,
      missingColumns,
      healthy: missingColumns.length === 0
    }
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
