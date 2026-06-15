import './load-env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_OWNER_EMAIL = 'ftapioca@gmail.com';
const DEFAULT_OWNER_NAME = 'Felipe Tapia';
const DEFAULT_COMPANY_SLUG = 'almio';
const DEFAULT_COMPANY_NAME = 'Almio Demo';

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? DEFAULT_OWNER_EMAIL;
  const ownerName = process.env.SEED_OWNER_NAME ?? DEFAULT_OWNER_NAME;
  const ownerSupabaseUserId = process.env.SEED_OWNER_SUPABASE_USER_ID ?? null;
  const companySlug = process.env.SEED_COMPANY_SLUG ?? DEFAULT_COMPANY_SLUG;
  const companyName = process.env.SEED_COMPANY_NAME ?? DEFAULT_COMPANY_NAME;
  const schemaName = `tenant_${companySlug}`;

  await prisma.country.upsert({
    where: { code: 'CL' },
    update: { name: 'Chile' },
    create: {
      code: 'CL',
      name: 'Chile',
    },
  });

  await prisma.currency.upsert({
    where: { code: 'CLP' },
    update: {
      name: 'Peso chileno',
      symbol: '$',
    },
    create: {
      code: 'CLP',
      name: 'Peso chileno',
      symbol: '$',
    },
  });

  const plans = [
    { code: 'STARTER', name: 'Starter', maxBranches: 1, maxEmployees: 10, maxUsers: 3, priceMonthly: '0.00' },
    { code: 'GROWTH', name: 'Growth', maxBranches: 3, maxEmployees: 25, maxUsers: 10, priceMonthly: '49.00' },
    { code: 'BUSINESS', name: 'Business', maxBranches: 5, maxEmployees: 50, maxUsers: 20, priceMonthly: '99.00' },
    { code: 'ENTERPRISE', name: 'Enterprise', maxBranches: 20, maxEmployees: 250, maxUsers: 100, priceMonthly: '249.00' },
  ];

  for (const plan of plans) {
    await prisma.saaSPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        maxCompanies: 1,
        maxBranches: plan.maxBranches,
        maxEmployees: plan.maxEmployees,
        maxUsers: plan.maxUsers,
        priceMonthly: plan.priceMonthly,
        deletedAt: null,
      },
      create: {
        code: plan.code,
        name: plan.name,
        maxCompanies: 1,
        maxBranches: plan.maxBranches,
        maxEmployees: plan.maxEmployees,
        maxUsers: plan.maxUsers,
        priceMonthly: plan.priceMonthly,
      },
    });
  }

  const selectedPlan = await prisma.saaSPlan.findUniqueOrThrow({
    where: { code: 'ENTERPRISE' },
  });

  const userAccount = await prisma.userAccount.upsert({
    where: { email: ownerEmail },
    update: {
      fullName: ownerName,
      status: 'ACTIVE',
      deletedAt: null,
      ...(ownerSupabaseUserId ? { supabaseUserId: ownerSupabaseUserId } : {}),
    },
    create: {
      email: ownerEmail,
      fullName: ownerName,
      status: 'ACTIVE',
      supabaseUserId: ownerSupabaseUserId,
    },
  });

  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: {
      name: companyName,
      schemaName,
      countryCode: 'CL',
      currencyCode: 'CLP',
      saasPlanId: selectedPlan.id,
      status: 'ACTIVE',
      deletedAt: null,
    },
    create: {
      name: companyName,
      slug: companySlug,
      schemaName,
      countryCode: 'CL',
      currencyCode: 'CLP',
      saasPlanId: selectedPlan.id,
      status: 'ACTIVE',
    },
  });

  await prisma.subscription.upsert({
    where: {
      id: `${company.id}-enterprise`,
    },
    update: {
      companyId: company.id,
      saasPlanId: selectedPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: null,
      deletedAt: null,
    },
    create: {
      id: `${company.id}-enterprise`,
      companyId: company.id,
      saasPlanId: selectedPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
    },
  });

  await prisma.companyMembership.upsert({
    where: {
      companyId_userAccountId: {
        companyId: company.id,
        userAccountId: userAccount.id,
      },
    },
    update: {
      role: 'OWNER',
      status: 'ACTIVE',
      deletedAt: null,
    },
    create: {
      companyId: company.id,
      userAccountId: userAccount.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  console.log(
    JSON.stringify(
      {
        company: {
          id: company.id,
          slug: company.slug,
          schemaName: company.schemaName,
        },
        owner: {
          id: userAccount.id,
          email: userAccount.email,
          supabaseUserId: userAccount.supabaseUserId,
        },
        authTestNotes: {
          tenantHeader: company.slug,
          requiredEmailForFallbackMembership: ownerEmail,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
