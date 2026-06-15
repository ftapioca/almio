import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

type SqlExecutor = {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

export type TenantMigrationFile = {
  version: string;
  fileName: string;
  sql: string;
};

export function assertTenantSchemaName(schemaName: string) {
  if (!/^tenant_[a-z0-9_]+$/.test(schemaName)) {
    throw new Error('Invalid tenant schema name');
  }
}

export function loadTenantMigrationFiles(): TenantMigrationFile[] {
  const migrationsDir = resolveTenantMigrationsDir();

  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()
    .map((fileName) => ({
      version: fileName,
      fileName,
      sql: readFileSync(join(migrationsDir, fileName), 'utf8'),
    }));
}

export async function applyTenantMigrations(
  executor: SqlExecutor,
  schemaName: string,
) {
  assertTenantSchemaName(schemaName);

  const quotedSchemaName = `"${schemaName}"`;
  const migrations = loadTenantMigrationFiles();
  let appliedCount = 0;

  await executor.$executeRawUnsafe(
    `CREATE SCHEMA IF NOT EXISTS ${quotedSchemaName}`,
  );

  await executor.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${quotedSchemaName}."tenant_migrations" (
      "version" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    const applied = await executor.$queryRawUnsafe<Array<{ version: string }>>(
      `SELECT "version" FROM ${quotedSchemaName}."tenant_migrations" WHERE "version" = $1`,
      migration.version,
    );

    if (applied.length > 0) {
      continue;
    }

    const statements = splitSqlStatements(
      migration.sql.replaceAll('__TENANT_SCHEMA__', quotedSchemaName),
    );

    for (const statement of statements) {
      await executor.$executeRawUnsafe(statement);
    }

    await executor.$executeRawUnsafe(
      `INSERT INTO ${quotedSchemaName}."tenant_migrations" ("version", "name") VALUES ($1, $2)`,
      migration.version,
      migration.fileName,
    );

    appliedCount += 1;
  }

  return {
    schemaName,
    appliedCount,
    totalMigrations: migrations.length,
  };
}

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function resolveTenantMigrationsDir() {
  const candidates = [
    join(process.cwd(), 'apps/api/prisma/tenant-migrations'),
    join(process.cwd(), 'prisma/tenant-migrations'),
    join(__dirname, '../../../prisma/tenant-migrations'),
  ];

  const foundPath = candidates.find((candidate) => existsSync(candidate));
  if (!foundPath) {
    throw new Error('Tenant migrations directory not found');
  }

  return foundPath;
}
