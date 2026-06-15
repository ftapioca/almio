import './load-env';
import { PrismaClient } from '@prisma/client';
import { quoteTenantSchemaName } from '../src/common/tenant/tenant-migration.util';

const prisma = new PrismaClient();

async function main() {
  const companySlug = getRequiredEnv('SCOPE_COMPANY_SLUG');
  const branchIds = readCsvEnv('SCOPE_BRANCH_IDS');
  const branchCodes = readCsvEnv('SCOPE_BRANCH_CODES');
  const mode = (process.env.SCOPE_MODE ?? 'replace').toLowerCase();
  const expectedRole = (process.env.SCOPE_ROLE_EXPECTED ?? 'BRANCH_ADMIN').toUpperCase();
  const email = process.env.SCOPE_EMAIL?.trim().toLowerCase() ?? null;
  const supabaseUserId = process.env.SCOPE_SUPABASE_USER_ID?.trim() ?? null;

  if (!email && !supabaseUserId) {
    throw new Error('SCOPE_EMAIL or SCOPE_SUPABASE_USER_ID is required');
  }

  if (branchIds.length === 0 && branchCodes.length === 0) {
    throw new Error('SCOPE_BRANCH_IDS or SCOPE_BRANCH_CODES is required');
  }

  if (!['replace', 'append'].includes(mode)) {
    throw new Error('SCOPE_MODE must be replace or append');
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { slug: companySlug },
    select: {
      id: true,
      slug: true,
      schemaName: true,
    },
  });

  const user = await prisma.userAccount.findFirstOrThrow({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      OR: [
        ...(email ? [{ email }] : []),
        ...(supabaseUserId ? [{ supabaseUserId }] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      supabaseUserId: true,
    },
  });

  const membership = await prisma.companyMembership.findFirstOrThrow({
    where: {
      companyId: company.id,
      userAccountId: user.id,
      deletedAt: null,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (membership.role.toUpperCase() !== expectedRole) {
    throw new Error(
      `Membership role mismatch. Expected ${expectedRole}, got ${membership.role}`,
    );
  }

  const resolvedBranches = await resolveBranches(company.schemaName, branchIds, branchCodes);
  const desiredBranchIds = resolvedBranches.map((branch) => branch.id);

  await prisma.$transaction(async (tx) => {
    if (mode === 'replace') {
      await tx.branchMembershipScope.updateMany({
        where: {
          companyId: company.id,
          membershipId: membership.id,
          deletedAt: null,
          branchId: {
            notIn: desiredBranchIds,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    for (const branch of resolvedBranches) {
      const existing = await tx.branchMembershipScope.findFirst({
        where: {
          companyId: company.id,
          membershipId: membership.id,
          branchId: branch.id,
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        await tx.branchMembershipScope.update({
          where: {
            id: existing.id,
          },
          data: {
            deletedAt: null,
          },
        });
        continue;
      }

      await tx.branchMembershipScope.create({
        data: {
          companyId: company.id,
          membershipId: membership.id,
          branchId: branch.id,
        },
      });
    }
  });

  console.log(
    JSON.stringify(
      {
        companySlug: company.slug,
        membershipId: membership.id,
        user: {
          email: user.email,
          supabaseUserId: user.supabaseUserId,
        },
        role: membership.role,
        mode,
        scopes: resolvedBranches,
      },
      null,
      2,
    ),
  );
}

async function resolveBranches(
  schemaName: string,
  branchIds: string[],
  branchCodes: string[],
) {
  const quotedSchema = quoteTenantSchemaName(schemaName);
  const branches = await prisma.$queryRawUnsafe<Array<{ id: string; code: string; name: string }>>(
    `SELECT "id", "code", "name"
     FROM ${quotedSchema}."branches"
     WHERE "deleted_at" IS NULL
       AND (
         COALESCE(array_length($1::uuid[], 1), 0) = 0 OR "id" = ANY($1::uuid[])
       )
       AND (
         COALESCE(array_length($2::text[], 1), 0) = 0 OR "code" = ANY($2::text[])
       )`,
    branchIds,
    branchCodes,
  );

  const foundIds = new Set(branches.map((branch) => branch.id));
  const foundCodes = new Set(branches.map((branch) => branch.code));
  const missingIds = branchIds.filter((branchId) => !foundIds.has(branchId));
  const missingCodes = branchCodes.filter((branchCode) => !foundCodes.has(branchCode));

  if (missingIds.length > 0 || missingCodes.length > 0) {
    throw new Error(
      `Branches not found. missingIds=${missingIds.join(',') || '-'} missingCodes=${
        missingCodes.join(',') || '-'
      }`,
    );
  }

  return branches;
}

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function readCsvEnv(key: string) {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
