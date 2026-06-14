-- Initial public schema for Almio SaaS Core
-- Derived from apps/api/prisma/schema.prisma

CREATE TABLE "saas_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_companies" INTEGER,
    "max_branches" INTEGER NOT NULL,
    "max_employees" INTEGER,
    "max_users" INTEGER NOT NULL,
    "price_monthly" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "saas_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "countries" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "currencies" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "schema_name" TEXT NOT NULL,
    "country_code" TEXT,
    "currency_code" TEXT,
    "saas_plan_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "saas_plan_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_accounts" (
    "id" TEXT NOT NULL,
    "supabase_user_id" TEXT,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_memberships" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_account_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log_saas" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "user_account_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_saas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saas_plans_code_key" ON "saas_plans"("code");
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE UNIQUE INDEX "companies_schema_name_key" ON "companies"("schema_name");
CREATE UNIQUE INDEX "user_accounts_supabase_user_id_key" ON "user_accounts"("supabase_user_id");
CREATE UNIQUE INDEX "user_accounts_email_key" ON "user_accounts"("email");
CREATE UNIQUE INDEX "company_membership_unique" ON "company_memberships"("company_id", "user_account_id");

ALTER TABLE "companies"
  ADD CONSTRAINT "companies_saas_plan_id_fkey"
  FOREIGN KEY ("saas_plan_id") REFERENCES "saas_plans"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "companies"
  ADD CONSTRAINT "companies_country_code_fkey"
  FOREIGN KEY ("country_code") REFERENCES "countries"("code")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "companies"
  ADD CONSTRAINT "companies_currency_code_fkey"
  FOREIGN KEY ("currency_code") REFERENCES "currencies"("code")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_saas_plan_id_fkey"
  FOREIGN KEY ("saas_plan_id") REFERENCES "saas_plans"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "company_memberships"
  ADD CONSTRAINT "company_memberships_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "company_memberships"
  ADD CONSTRAINT "company_memberships_user_account_id_fkey"
  FOREIGN KEY ("user_account_id") REFERENCES "user_accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_log_saas"
  ADD CONSTRAINT "audit_log_saas_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_log_saas"
  ADD CONSTRAINT "audit_log_saas_user_account_id_fkey"
  FOREIGN KEY ("user_account_id") REFERENCES "user_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
