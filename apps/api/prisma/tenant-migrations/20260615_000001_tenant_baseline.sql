CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__."tenant_settings" (
  "id" BOOLEAN PRIMARY KEY DEFAULT TRUE,
  "company_name" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
  "locale" TEXT NOT NULL DEFAULT 'es-CL',
  "currency_code" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "tenant_settings_singleton" CHECK ("id" = TRUE)
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__."branches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS "branches_code_unique_idx"
  ON __TENANT_SCHEMA__."branches" ("code")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__."employees" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" UUID REFERENCES __TENANT_SCHEMA__."branches" ("id") ON DELETE SET NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "hired_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS "employees_email_unique_idx"
  ON __TENANT_SCHEMA__."employees" ("email")
  WHERE "email" IS NOT NULL AND "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__."audit_log_tenant" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_user_account_id" UUID,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "details_json" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
