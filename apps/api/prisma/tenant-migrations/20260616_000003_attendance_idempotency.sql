ALTER TABLE __TENANT_SCHEMA__."attendance_records"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_records_idempotency_key_unique"
  ON __TENANT_SCHEMA__."attendance_records" ("idempotency_key")
  WHERE "deleted_at" IS NULL AND "idempotency_key" IS NOT NULL;
