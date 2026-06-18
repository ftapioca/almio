function getRequiredPublicEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getPublicApiUrl(): string {
  return getRequiredPublicEnv('NEXT_PUBLIC_API_URL').replace(/\/+$/, '');
}
