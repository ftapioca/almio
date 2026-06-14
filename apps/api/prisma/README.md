# Prisma

Base de datos y modelos globales de `SaaS Core` para Almio.

## Alcance actual

El schema actual cubre el `schema public` descrito en SDD/SRS:

- `SaaSPlan`
- `Company`
- `Subscription`
- `UserAccount`
- `CompanyMembership`
- `Country`
- `Currency`
- `AuditLogSaaS`

## Comandos útiles

- `pnpm prisma:validate`
- `pnpm prisma:generate`
- `pnpm prisma:migrate:deploy`
- `pnpm prisma:seed`

## Nota operativa

`prisma validate` y `prisma generate` requieren `DATABASE_URL` definida, aunque la generación del cliente no necesite conectarse realmente a la base.

La migración inicial del `schema public` quedó versionada en:

- `prisma/migrations/20260614_000001_init_public_schema/migration.sql`

## Seed inicial

El seed de `SaaS Core` crea o actualiza:

- planes `STARTER`, `GROWTH`, `BUSINESS`, `ENTERPRISE`
- `Country` `CL`
- `Currency` `CLP`
- una `Company` inicial
- un `UserAccount` owner
- `CompanyMembership` con rol `OWNER`
- `Subscription` activa

Variables opcionales:

- `SEED_COMPANY_NAME`
- `SEED_COMPANY_SLUG`
- `SEED_OWNER_EMAIL`
- `SEED_OWNER_NAME`
- `SEED_OWNER_SUPABASE_USER_ID`
