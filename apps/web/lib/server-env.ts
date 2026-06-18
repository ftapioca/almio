export function getRequiredServerEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getApiBaseUrl() {
  return getRequiredServerEnv('NEXT_PUBLIC_API_URL').replace(/\/+$/, '');
}
