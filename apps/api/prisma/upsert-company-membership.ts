import './load-env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companySlug = getRequiredEnv('MEMBERSHIP_COMPANY_SLUG');
  const email = getRequiredEnv('MEMBERSHIP_EMAIL').toLowerCase();
  const role = getRequiredEnv('MEMBERSHIP_ROLE').toUpperCase();
  const fullName = process.env.MEMBERSHIP_FULL_NAME?.trim() ?? null;
  const supabaseUserId = process.env.MEMBERSHIP_SUPABASE_USER_ID?.trim() ?? null;

  const allowedRoles = new Set([
    'SUPERADMIN',
    'OWNER',
    'BRANCH_ADMIN',
    'CASHIER',
    'EMPLOYEE',
  ]);

  if (!allowedRoles.has(role)) {
    throw new Error(`Invalid MEMBERSHIP_ROLE: ${role}`);
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { slug: companySlug },
    select: {
      id: true,
      slug: true,
    },
  });

  const user = await prisma.userAccount.upsert({
    where: { email },
    update: {
      fullName: fullName ?? undefined,
      status: 'ACTIVE',
      deletedAt: null,
      ...(supabaseUserId ? { supabaseUserId } : {}),
    },
    create: {
      email,
      fullName,
      status: 'ACTIVE',
      supabaseUserId,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      supabaseUserId: true,
    },
  });

  const membership = await prisma.companyMembership.upsert({
    where: {
      companyId_userAccountId: {
        companyId: company.id,
        userAccountId: user.id,
      },
    },
    update: {
      role,
      status: 'ACTIVE',
      deletedAt: null,
    },
    create: {
      companyId: company.id,
      userAccountId: user.id,
      role,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        companySlug: company.slug,
        user,
        membership,
      },
      null,
      2,
    ),
  );
}

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
