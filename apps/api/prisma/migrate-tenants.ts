import './load-env';
import { PrismaClient } from '@prisma/client';
import { applyTenantMigrations } from '../src/common/tenant/tenant-migration.util';

async function main() {
  const prisma = new PrismaClient();

  try {
    const companies = await prisma.company.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        slug: true,
        schemaName: true,
      },
    });

    if (companies.length === 0) {
      console.log('No companies found for tenant migrations');
      return;
    }

    for (const company of companies) {
      const result = await applyTenantMigrations(prisma, company.schemaName);
      console.log(
        `${company.slug}: applied ${result.appliedCount}/${result.totalMigrations} tenant migrations`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
