import './load-env';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { applyTenantMigrations } from '../src/common/tenant/tenant-migration.util';

type CompanyRecord = {
  slug: string;
  schemaName: string;
};

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getTargetCompanySlugs() {
  const rawValue = getOptionalEnv('TENANT_MIGRATION_COMPANY_SLUGS');
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function runPublicMigrations() {
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(command, ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error('Public schema migration failed');
  }
}

async function loadCompanies(
  prisma: PrismaClient,
  targetSlugs: string[],
): Promise<CompanyRecord[]> {
  return prisma.company.findMany({
    where: {
      deletedAt: null,
      ...(targetSlugs.length > 0
        ? {
            slug: {
              in: targetSlugs,
            },
          }
        : {}),
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      slug: true,
      schemaName: true,
    },
  });
}

async function runTenantMigrations(
  prisma: PrismaClient,
  companies: CompanyRecord[],
) {
  for (const company of companies) {
    const result = await applyTenantMigrations(prisma, company.schemaName);
    console.log(
      `[tenant] ${company.slug}: applied ${result.appliedCount}/${result.totalMigrations} tenant migrations`,
    );
  }
}

async function main() {
  const prisma = new PrismaClient();
  const targetSlugs = getTargetCompanySlugs();

  try {
    console.log('[release] running public schema migrations');
    runPublicMigrations();

    console.log('[release] loading tenant migration targets');
    const companies = await loadCompanies(prisma, targetSlugs);

    if (companies.length === 0) {
      console.log('[release] no companies found for tenant migrations');
      return;
    }

    console.log(
      `[release] running tenant migrations for ${companies.length} company schemas`,
    );
    await runTenantMigrations(prisma, companies);
    console.log('[release] migration sequence completed');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[release] migration sequence failed');
  console.error(error);
  process.exit(1);
});
