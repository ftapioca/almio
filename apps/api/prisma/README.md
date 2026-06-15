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
- `pnpm prisma:promote-superadmin`
- `pnpm prisma:seed`

## Nota operativa

`prisma validate` y `prisma generate` requieren `DATABASE_URL` definida, aunque la generación del cliente no necesite conectarse realmente a la base.

## URLs recomendadas para Supabase

Para Almio conviene separar:

- `DATABASE_URL`: conexión de runtime para la app
- `DIRECT_URL`: conexión directa para migraciones y operaciones administrativas

Configuración recomendada con Supabase:

- `DATABASE_URL`:
  usar `Shared Pooler / Session mode` (`aws-[region].pooler.supabase.com:5432`)
- `DIRECT_URL`:
  usar la conexión directa (`db.[project-ref].supabase.co:5432`)

Esto sigue la recomendación oficial de Supabase:

- conexión directa para migraciones, `pg_dump` y sesiones largas
- pooler session mode para backend persistente en redes IPv4-only

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

## Promoción temporal a SUPERADMIN

Para probar endpoints `admin` de Fase 1, existe un script auxiliar:

- `pnpm prisma:promote-superadmin`

Variables opcionales:

- `PROMOTE_EMAIL`
- `PROMOTE_COMPANY_SLUG`
