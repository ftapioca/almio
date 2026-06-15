import './load-env';
import { PrismaClient } from '@prisma/client';

type AdminUserResponse = {
  id: string;
  email?: string;
};

const prisma = new PrismaClient();

async function main() {
  const email = getRequiredEnv('AUTH_USER_EMAIL').toLowerCase();
  const password = getRequiredEnv('AUTH_USER_PASSWORD');
  const autoConfirm = (process.env.AUTH_USER_AUTO_CONFIRM ?? 'true').toLowerCase() !== 'false';
  const fullName = process.env.AUTH_USER_FULL_NAME?.trim() ?? null;

  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = getRequiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const adminBaseUrl = `${supabaseUrl}/auth/v1/admin/users`;

  let authUser = await findAuthUserByEmail(adminBaseUrl, serviceRoleKey, email);

  if (!authUser) {
    authUser = await createAuthUser(adminBaseUrl, serviceRoleKey, {
      email,
      password,
      email_confirm: autoConfirm,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
  } else {
    authUser = await updateAuthUser(
      adminBaseUrl,
      serviceRoleKey,
      authUser.id,
      {
        password,
        email_confirm: autoConfirm,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      },
    );
  }

  const userAccount = await prisma.userAccount.upsert({
    where: { email },
    update: {
      supabaseUserId: authUser.id,
      status: 'ACTIVE',
      deletedAt: null,
      ...(fullName ? { fullName } : {}),
    },
    create: {
      email,
      supabaseUserId: authUser.id,
      status: 'ACTIVE',
      fullName,
    },
    select: {
      id: true,
      email: true,
      supabaseUserId: true,
      fullName: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        authUser,
        userAccount,
      },
      null,
      2,
    ),
  );
}

async function findAuthUserByEmail(
  adminBaseUrl: string,
  serviceRoleKey: string,
  email: string,
): Promise<AdminUserResponse | null> {
  const url = new URL(adminBaseUrl);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '200');

  const response = await fetch(url, {
    headers: buildAdminHeaders(serviceRoleKey),
  });

  if (!response.ok) {
    throw new Error(`Failed to list auth users: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { users?: AdminUserResponse[] };
  const user = payload.users?.find((candidate) => candidate.email?.toLowerCase() === email);

  return user ?? null;
}

async function createAuthUser(
  adminBaseUrl: string,
  serviceRoleKey: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(adminBaseUrl, {
    method: 'POST',
    headers: buildAdminHeaders(serviceRoleKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to create auth user: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as AdminUserResponse;
}

async function updateAuthUser(
  adminBaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${adminBaseUrl}/${userId}`, {
    method: 'PUT',
    headers: buildAdminHeaders(serviceRoleKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to update auth user: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as AdminUserResponse;
}

function buildAdminHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
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
