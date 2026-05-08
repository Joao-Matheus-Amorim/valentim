import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const whereAmI = await prisma.$queryRawUnsafe<any[]>(`
    select
      current_database() as database,
      current_schema() as schema,
      inet_server_addr()::text as server
  `);

  const columns = await prisma.$queryRawUnsafe<any[]>(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'DocumentRequest'
    order by ordinal_position
  `);

  console.log(JSON.stringify({
    whereAmI,
    columns: columns.map((column) => column.column_name)
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
