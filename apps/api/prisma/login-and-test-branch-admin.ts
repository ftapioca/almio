import './load-env';

async function main() {
  const email = getRequiredEnv('LOGIN_TEST_EMAIL').toLowerCase();
  const password = getRequiredEnv('LOGIN_TEST_PASSWORD');
  const tenantId = process.env.LOGIN_TEST_TENANT_ID?.trim() ?? 'almio';
  const apiUrl = (process.env.LOGIN_TEST_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1').replace(/\/$/, '');
  const supabaseUrl = getRequiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    getRequiredEnv('SUPABASE_ANON_KEY');

  const token = await loginWithPassword(supabaseUrl, anonKey, email, password);

  const checks = await Promise.all([
    callApi(`${apiUrl}/branches`, token, tenantId),
    callApi(`${apiUrl}/employees`, token, tenantId),
    callApi(`${apiUrl}/attendance`, token, tenantId),
    callApi(`${apiUrl}/shifts`, token, tenantId),
  ]);

  console.log(
    JSON.stringify(
      {
        email,
        tenantId,
        accessTokenPreview: `${token.slice(0, 20)}...`,
        checks,
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
    body: JSON.stringify({
      email,
      password,
    }),
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

async function callApi(url: string, token: string, tenantId: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
    },
  });

  const bodyText = await response.text();
  let body: unknown = bodyText;

  try {
    body = JSON.parse(bodyText);
  } catch {}

  return {
    url,
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
