import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PROMOTE_EMAIL ?? 'ftapioca@gmail.com';
  const slug = process.env.PROMOTE_COMPANY_SLUG ?? 'almio';

  const user = await prisma.userAccount.findUniqueOrThrow({
    where: { email },
    select: { id: true, email: true },
  });

  const company = await prisma.company.findUniqueOrThrow({
    where: { slug },
    select: { id: true, slug: true },
  });

  const membership = await prisma.companyMembership.findFirstOrThrow({
    where: {
      companyId: company.id,
      userAccountId: user.id,
      deletedAt: null,
    },
    select: {
      id: true,
      role: true,
    },
  });

  await prisma.companyMembership.update({
    where: { id: membership.id },
    data: {
      role: 'SUPERADMIN',
    },
  });

  console.log(
    JSON.stringify(
      {
        email: user.email,
        companySlug: company.slug,
        previousRole: membership.role,
        newRole: 'SUPERADMIN',
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
