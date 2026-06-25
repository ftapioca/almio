export function normalizeApiBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export async function parseApiResponse<T>(response: Response, fallbackMessage: string) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? payload?.message ?? fallbackMessage);
  }

  return payload.data as T;
}

type BackofficeRequestOptions = {
  accessToken: string;
  apiBaseUrl: string;
  body?: unknown;
  fallbackMessage: string;
  headers?: HeadersInit;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT';
  path: string;
  tenantId: string;
};

export async function requestBackofficeApi<T>({
  accessToken,
  apiBaseUrl,
  body,
  fallbackMessage,
  headers,
  method = 'GET',
  path,
  tenantId,
}: BackofficeRequestOptions) {
  const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'X-Tenant-ID': tenantId.trim(),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  return parseApiResponse<T>(response, fallbackMessage);
}
