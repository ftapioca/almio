CREATE TABLE "branch_membership_scopes" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "branch_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "branch_membership_scopes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branch_membership_scope_unique"
ON "branch_membership_scopes"("company_id", "membership_id", "branch_id");

ALTER TABLE "branch_membership_scopes"
  ADD CONSTRAINT "branch_membership_scopes_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "branch_membership_scopes"
  ADD CONSTRAINT "branch_membership_scopes_membership_id_fkey"
  FOREIGN KEY ("membership_id") REFERENCES "company_memberships"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
