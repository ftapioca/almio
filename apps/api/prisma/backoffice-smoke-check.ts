import './load-env';

type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail: string;
};

type ApiResponse = {
  response: Response;
  bodyText: string;
  bodyJson?: unknown;
};

type AttendanceRecord = {
  id: string;
  branchId: string;
  employeeId: string;
  eventType: string;
  eventAt: string;
};

type ShiftRecord = {
  id: string;
  branchId: string;
  employeeId: string | null;
  status: string;
  startsAt: string;
  endsAt: string;
};

async function main() {
  const mode = (process.env.BACKOFFICE_SMOKE_MODE ?? 'full').toLowerCase();
  const apiBaseUrl = normalizeBaseUrl(
    process.env.BACKOFFICE_SMOKE_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1',
  );
  const webBaseUrl = normalizeBaseUrl(
    process.env.BACKOFFICE_SMOKE_WEB_URL ?? 'http://localhost:3000',
  );
  const tenantId = process.env.BACKOFFICE_SMOKE_TENANT_ID?.trim() ?? 'almio';
  const email = process.env.BACKOFFICE_SMOKE_EMAIL?.trim().toLowerCase() ?? null;
  const password = process.env.BACKOFFICE_SMOKE_PASSWORD?.trim() ?? null;
  const membershipId = process.env.BACKOFFICE_SMOKE_MEMBERSHIP_ID?.trim() ?? null;
  const supabaseUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/+$/, '') ?? null;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.SUPABASE_ANON_KEY?.trim() ??
    null;

  const results: CheckResult[] = [];

  results.push(await checkWebLoginPage(webBaseUrl));
  results.push(await checkProtectedRedirect(webBaseUrl, '/backoffice'));
  results.push(await checkProtectedRedirect(webBaseUrl, '/backoffice/attendance'));
  results.push(await checkProtectedRedirect(webBaseUrl, '/backoffice/shifts'));
  results.push(await checkProtectedRedirect(webBaseUrl, '/backoffice/branch-scopes'));
  results.push(await checkApiHealth(`${apiBaseUrl}/health/live`, 'api.health.live'));
  results.push(await checkApiHealth(`${apiBaseUrl}/health/ready`, 'api.health.ready'));

  if (mode !== 'anonymous') {
    if (!email || !password || !supabaseUrl || !anonKey) {
      throw new Error(
        'BACKOFFICE_SMOKE_EMAIL, BACKOFFICE_SMOKE_PASSWORD, SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required for full mode',
      );
    }

    const accessToken = await loginWithPassword(supabaseUrl, anonKey, email, password);
    results.push(await checkAuthenticatedApi(`${apiBaseUrl}/me`, accessToken, tenantId, 'api.me'));
    results.push(
      await checkAuthenticatedApi(`${apiBaseUrl}/branches?limit=20`, accessToken, tenantId, 'api.branches'),
    );
    results.push(
      await checkAuthenticatedApi(`${apiBaseUrl}/employees?limit=20`, accessToken, tenantId, 'api.employees'),
    );

    const attendanceListResult = await checkAuthenticatedApiWithBody(
      `${apiBaseUrl}/attendance?limit=20`,
      accessToken,
      tenantId,
      'api.attendance',
    );
    results.push(attendanceListResult.check);

    const shiftListResult = await checkAuthenticatedApiWithBody(
      `${apiBaseUrl}/shifts?limit=20`,
      accessToken,
      tenantId,
      'api.shifts',
    );
    results.push(shiftListResult.check);

    results.push(
      ...(await runAttendanceFunctionalChecks(
        apiBaseUrl,
        accessToken,
        tenantId,
        attendanceListResult.bodyJson,
      )),
    );
    results.push(
      ...(await runShiftFunctionalChecks(
        apiBaseUrl,
        accessToken,
        tenantId,
        shiftListResult.bodyJson,
      )),
    );

    if (membershipId) {
      results.push(
        await checkAuthenticatedApi(
          `${apiBaseUrl}/admin/branch-membership-scopes?membershipId=${encodeURIComponent(membershipId)}`,
          accessToken,
          tenantId,
          'api.admin.branch-membership-scopes',
        ),
      );
    } else {
      results.push({
        name: 'api.admin.branch-membership-scopes',
        ok: true,
        detail: 'skipped: BACKOFFICE_SMOKE_MEMBERSHIP_ID not provided',
      });
    }
  }

  const failedChecks = results.filter((result) => !result.ok);

  console.log(
    JSON.stringify(
      {
        mode,
        apiBaseUrl,
        webBaseUrl,
        tenantId,
        results,
        summary: {
          total: results.length,
          passed: results.length - failedChecks.length,
          failed: failedChecks.length,
        },
      },
      null,
      2,
    ),
  );

  if (failedChecks.length > 0) {
    process.exit(1);
  }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

async function readResponse(response: Response): Promise<ApiResponse> {
  const bodyText = await response.text();
  let bodyJson: unknown;

  try {
    bodyJson = JSON.parse(bodyText);
  } catch {}

  return {
    response,
    bodyText,
    bodyJson,
  };
}

async function checkWebLoginPage(webBaseUrl: string): Promise<CheckResult> {
  const response = await fetch(`${webBaseUrl}/auth/login`, { redirect: 'manual' });
  const { bodyText } = await readResponse(response);
  const ok =
    response.status === 200 &&
    (bodyText.includes('Iniciar sesion') || bodyText.includes('Supabase Auth'));

  return {
    name: 'web.auth.login-page',
    ok,
    status: response.status,
    detail: ok
      ? 'login page rendered'
      : 'expected 200 plus login markers on /auth/login',
  };
}

async function checkProtectedRedirect(
  webBaseUrl: string,
  path: string,
): Promise<CheckResult> {
  const response = await fetch(`${webBaseUrl}${path}`, { redirect: 'manual' });
  const location = response.headers.get('location') ?? '';
  const expectedLocation = `/auth/login?next=${encodeURIComponent(path)}`;
  const ok =
    (response.status === 307 || response.status === 302) &&
    location === expectedLocation;

  return {
    name: `web.redirect${path}`,
    ok,
    status: response.status,
    detail: ok
      ? `redirected to ${expectedLocation}`
      : `expected redirect to ${expectedLocation}, got ${location || 'empty location header'}`,
  };
}

async function checkApiHealth(url: string, name: string): Promise<CheckResult> {
  const response = await fetch(url);
  const { bodyJson, bodyText } = await readResponse(response);
  const readyDatabaseUp =
    !url.endsWith('/health/ready') ||
    (typeof bodyJson === 'object' &&
      bodyJson !== null &&
      JSON.stringify(bodyJson).includes('"database":{"status":"up"'));
  const ok = response.status === 200 && readyDatabaseUp;

  return {
    name,
    ok,
    status: response.status,
    detail: ok ? 'health probe passed' : bodyText.slice(0, 240),
  };
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
    throw new Error(`Supabase login failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('Supabase login succeeded but access_token was missing');
  }

  return payload.access_token;
}

async function checkAuthenticatedApi(
  url: string,
  token: string,
  tenantId: string,
  name: string,
): Promise<CheckResult> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
    },
  });

  const { bodyText } = await readResponse(response);
  const ok = response.status === 200;

  return {
    name,
    ok,
    status: response.status,
    detail: ok ? 'authenticated probe passed' : bodyText.slice(0, 240),
  };
}

async function checkAuthenticatedApiWithBody(
  url: string,
  token: string,
  tenantId: string,
  name: string,
) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
    },
  });

  const { bodyText, bodyJson } = await readResponse(response);
  const ok = response.status === 200;

  return {
    check: {
      name,
      ok,
      status: response.status,
      detail: ok ? 'authenticated probe passed' : bodyText.slice(0, 240),
    } satisfies CheckResult,
    bodyJson,
  };
}

async function runAttendanceFunctionalChecks(
  apiBaseUrl: string,
  token: string,
  tenantId: string,
  bodyJson: unknown,
): Promise<CheckResult[]> {
  const records = extractDataArray<AttendanceRecord>(bodyJson);

  if (records.length === 0) {
    return [
      {
        name: 'api.attendance.functional',
        ok: true,
        detail: 'skipped: no attendance records available in list probe',
      },
    ];
  }

  const target = records[0];
  const dayBounds = getDayBounds(target.eventAt);
  const detailChecks: CheckResult[] = [];

  detailChecks.push(
    await checkAuthenticatedApi(
      `${apiBaseUrl}/attendance/${target.id}`,
      token,
      tenantId,
      'api.attendance.get-by-id',
    ),
  );

  const filteredResult = await checkAuthenticatedApiWithBody(
    `${apiBaseUrl}/attendance?limit=20&branchId=${encodeURIComponent(target.branchId)}&employeeId=${encodeURIComponent(target.employeeId)}&from=${encodeURIComponent(dayBounds.start)}&to=${encodeURIComponent(dayBounds.end)}`,
    token,
    tenantId,
    'api.attendance.filtered-day',
  );
  detailChecks.push(filteredResult.check);

  const filteredItems = extractDataArray<AttendanceRecord>(filteredResult.bodyJson);
  detailChecks.push({
    name: 'api.attendance.filtered-day.contains-record',
    ok: filteredItems.some((record) => record.id === target.id),
    detail: filteredItems.some((record) => record.id === target.id)
      ? `record ${target.id} present in filtered day probe`
      : `record ${target.id} missing from filtered day probe`,
  });

  return detailChecks;
}

async function runShiftFunctionalChecks(
  apiBaseUrl: string,
  token: string,
  tenantId: string,
  bodyJson: unknown,
): Promise<CheckResult[]> {
  const shifts = extractDataArray<ShiftRecord>(bodyJson);

  if (shifts.length === 0) {
    return [
      {
        name: 'api.shifts.functional',
        ok: true,
        detail: 'skipped: no shift records available in list probe',
      },
    ];
  }

  const target = shifts[0];
  const dayBounds = getDayBounds(target.startsAt);
  const detailChecks: CheckResult[] = [];

  detailChecks.push(
    await checkAuthenticatedApi(
      `${apiBaseUrl}/shifts/${target.id}`,
      token,
      tenantId,
      'api.shifts.get-by-id',
    ),
  );

  const params = new URLSearchParams({
    limit: '20',
    branchId: target.branchId,
    from: dayBounds.start,
    to: dayBounds.end,
  });
  if (target.employeeId) {
    params.set('employeeId', target.employeeId);
  }
  if (target.status) {
    params.set('status', target.status);
  }

  const filteredResult = await checkAuthenticatedApiWithBody(
    `${apiBaseUrl}/shifts?${params.toString()}`,
    token,
    tenantId,
    'api.shifts.filtered-day',
  );
  detailChecks.push(filteredResult.check);

  const filteredItems = extractDataArray<ShiftRecord>(filteredResult.bodyJson);
  detailChecks.push({
    name: 'api.shifts.filtered-day.contains-record',
    ok: filteredItems.some((shift) => shift.id === target.id),
    detail: filteredItems.some((shift) => shift.id === target.id)
      ? `shift ${target.id} present in filtered day probe`
      : `shift ${target.id} missing from filtered day probe`,
  });

  return detailChecks;
}

function extractDataArray<T>(bodyJson: unknown): T[] {
  if (
    typeof bodyJson === 'object' &&
    bodyJson !== null &&
    'data' in bodyJson &&
    Array.isArray((bodyJson as { data?: unknown }).data)
  ) {
    return (bodyJson as { data: T[] }).data;
  }

  return [];
}

function getDayBounds(value: string) {
  const source = new Date(value);
  const start = new Date(source);
  start.setHours(0, 0, 0, 0);

  const end = new Date(source);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
