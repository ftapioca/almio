CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__."attendance_records" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" UUID NOT NULL REFERENCES __TENANT_SCHEMA__."branches" ("id") ON DELETE RESTRICT,
  "employee_id" UUID NOT NULL REFERENCES __TENANT_SCHEMA__."employees" ("id") ON DELETE RESTRICT,
  "event_type" TEXT NOT NULL,
  "event_at" TIMESTAMPTZ NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "attendance_records_branch_event_at_idx"
  ON __TENANT_SCHEMA__."attendance_records" ("branch_id", "event_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "attendance_records_employee_event_at_idx"
  ON __TENANT_SCHEMA__."attendance_records" ("employee_id", "event_at")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__."shifts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" UUID NOT NULL REFERENCES __TENANT_SCHEMA__."branches" ("id") ON DELETE RESTRICT,
  "employee_id" UUID REFERENCES __TENANT_SCHEMA__."employees" ("id") ON DELETE SET NULL,
  "starts_at" TIMESTAMPTZ NOT NULL,
  "ends_at" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "shifts_branch_starts_at_idx"
  ON __TENANT_SCHEMA__."shifts" ("branch_id", "starts_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "shifts_employee_starts_at_idx"
  ON __TENANT_SCHEMA__."shifts" ("employee_id", "starts_at")
  WHERE "deleted_at" IS NULL;
