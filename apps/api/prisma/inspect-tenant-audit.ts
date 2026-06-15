import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schemaName = process.env.INSPECT_TENANT_SCHEMA ?? 'tenant_almio';
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      action: string;
      resource: string;
      detailsJson: unknown;
      createdAt: Date;
    }>
  >(
    `SELECT
       "action",
       "resource",
       "details_json" AS "detailsJson",
       "created_at" AS "createdAt"
     FROM "${schemaName}"."audit_log_tenant"
     ORDER BY "created_at" DESC
     LIMIT 10`,
  );

  console.log(JSON.stringify({ schemaName, rows }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
