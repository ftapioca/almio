function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getNumberEnv(name: string, fallback: number): number {
  const rawValue = getOptionalEnv(name);
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsedValue;
}

function getListEnv(name: string): string[] {
  const rawValue = getOptionalEnv(name);
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getApiRuntimeConfig() {
  return {
    port: getNumberEnv('API_PORT', 3001),
    corsAllowedOrigins: getListEnv('API_CORS_ALLOWED_ORIGINS'),
  };
}
