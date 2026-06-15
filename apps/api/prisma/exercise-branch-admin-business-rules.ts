import './load-env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = getRequiredEnv('RULES_TEST_EMAIL').toLowerCase();
  const password = getRequiredEnv('RULES_TEST_PASSWORD');
  const tenantId = process.env.RULES_TEST_TENANT_ID?.trim() ?? 'almio';
  const branchCode = process.env.RULES_TEST_BRANCH_CODE?.trim() ?? 'BR-20260615-B';
  const employeeEmail = process.env.RULES_TEST_EMPLOYEE_EMAIL?.trim() ?? 'phase2-20260615@almio.cl';
  const apiUrl = (process.env.RULES_TEST_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1').replace(/\/$/, '');
  const supabaseUrl = getRequiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    getRequiredEnv('SUPABASE_ANON_KEY');

  const token = await loginWithPassword(supabaseUrl, anonKey, email, password);
  const company = await prisma.company.findUniqueOrThrow({
    where: { slug: tenantId },
    select: { schemaName: true },
  });
  const branch = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
    `SELECT "id", "code"
     FROM "${company.schemaName}"."branches"
     WHERE "code" = $1 AND "deleted_at" IS NULL
     LIMIT 1`,
    branchCode,
  );
  const employee = await prisma.$queryRawUnsafe<Array<{ id: string; branchId: string; email: string }>>(
    `SELECT
       "id",
       "branch_id" AS "branchId",
       "email"
     FROM "${company.schemaName}"."employees"
     WHERE "email" = $1 AND "deleted_at" IS NULL
     LIMIT 1`,
    employeeEmail,
  );

  const selectedBranch = branch[0];
  const selectedEmployee = employee[0];
  if (!selectedBranch || !selectedEmployee) {
    throw new Error('Branch or employee fixture not found for business rule test');
  }

  const attendanceStart = new Date();
  attendanceStart.setMinutes(attendanceStart.getMinutes() - 1);

  const shiftStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  shiftStart.setMinutes(0, 0, 0);
  const shiftEnd = new Date(shiftStart.getTime() + 8 * 60 * 60 * 1000);

  const results = {
    attendanceValid: await callApi(`${apiUrl}/attendance`, token, tenantId, {
      method: 'POST',
      body: {
        branchId: selectedBranch.id,
        employeeId: selectedEmployee.id,
        eventType: 'CHECK_IN',
        eventAt: attendanceStart.toISOString(),
        source: 'MANUAL',
        notes: 'Real branch admin business rule test',
      },
    }),
    attendanceInvalid: await callApi(`${apiUrl}/attendance`, token, tenantId, {
      method: 'POST',
      body: {
        branchId: selectedBranch.id,
        employeeId: selectedEmployee.id,
        eventType: 'CHECK_IN',
        eventAt: new Date(attendanceStart.getTime() + 30 * 1000).toISOString(),
        source: 'MANUAL',
        notes: 'Should fail due to invalid sequence',
      },
    }),
    shiftValid: await callApi(`${apiUrl}/shifts`, token, tenantId, {
      method: 'POST',
      body: {
        branchId: selectedBranch.id,
        employeeId: selectedEmployee.id,
        startsAt: shiftStart.toISOString(),
        endsAt: shiftEnd.toISOString(),
        status: 'SCHEDULED',
        notes: 'Real branch admin shift rule test',
      },
    }),
    shiftInvalid: await callApi(`${apiUrl}/shifts`, token, tenantId, {
      method: 'POST',
      body: {
        branchId: selectedBranch.id,
        employeeId: selectedEmployee.id,
        startsAt: new Date(shiftStart.getTime() + 60 * 60 * 1000).toISOString(),
        endsAt: new Date(shiftEnd.getTime() + 60 * 60 * 1000).toISOString(),
        status: 'SCHEDULED',
        notes: 'Should fail due to overlap',
      },
    }),
  };

  console.log(
    JSON.stringify(
      {
        email,
        tenantId,
        branchCode,
        employeeEmail,
        results,
      },
      null,
      2,
    ),
  );
}

async function loginWithPassword(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string,
) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('Login succeeded but access_token was missing');
  }

  return payload.access_token;
}

async function callApi(
  url: string,
  token: string,
  tenantId: string,
  init: {
    method?: string;
    body?: unknown;
  } = {},
) {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const bodyText = await response.text();
  let body: unknown = bodyText;

  try {
    body = JSON.parse(bodyText);
  } catch {}

  return {
    status: response.status,
    ok: response.ok,
    body,
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
