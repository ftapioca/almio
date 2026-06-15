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
- `pnpm prisma:migrate:tenants`
- `pnpm prisma:upsert-company-membership`
- `pnpm prisma:assign-branch-scopes`
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
  preferir la conexión directa (`db.[project-ref].supabase.co:5432`) sólo si el entorno tiene IPv6 o el add-on IPv4
  si el entorno es IPv4-only y Prisma Migrate falla con `Schema engine error`, usar también `Session mode` en `aws-[region].pooler.supabase.com:5432`

Esto sigue la recomendación oficial de Supabase:

- conexión directa para migraciones, `pg_dump` y sesiones largas
- pooler session mode para backend persistente en redes IPv4-only

La migración inicial del `schema public` quedó versionada en:

- `prisma/migrations/20260614_000001_init_public_schema/migration.sql`

## Tenant migrations

El baseline por tenant quedó separado del `schema public` en:

- `prisma/tenant-migrations/20260615_000001_tenant_baseline.sql`

Objetivo actual del baseline tenant:

- tabla `tenant_migrations` por schema para versionado
- `tenant_settings` como metadata mínima
- `branches` y `employees` como base de Fase 2
- `attendance_records` y `shifts` como base de Fase 3
- `audit_log_tenant` para trazabilidad operativa futura

Comando para aplicar el baseline a tenants ya existentes:

- `pnpm prisma:migrate:tenants`

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

## Asignación de scopes por sucursal

El enforcement de `BRANCH_ADMIN` depende de `public.branch_membership_scopes`.

Flujo operativo actual:

1. crear o promover la `company_membership` con rol `BRANCH_ADMIN`
2. crear las sucursales en el tenant
3. asignar scopes con `pnpm prisma:assign-branch-scopes`

Paso 1:

```bash
MEMBERSHIP_COMPANY_SLUG=almio \
MEMBERSHIP_EMAIL=manager@almio.cl \
MEMBERSHIP_ROLE=BRANCH_ADMIN \
pnpm prisma:upsert-company-membership
```

Variables soportadas por `upsert-company-membership`:

- `MEMBERSHIP_COMPANY_SLUG` requerido
- `MEMBERSHIP_EMAIL` requerido
- `MEMBERSHIP_ROLE` requerido
- `MEMBERSHIP_FULL_NAME` opcional
- `MEMBERSHIP_SUPABASE_USER_ID` opcional

Variables soportadas por el script:

- `SCOPE_COMPANY_SLUG` requerido
- `SCOPE_EMAIL` o `SCOPE_SUPABASE_USER_ID` requerido
- `SCOPE_BRANCH_IDS` opcional, csv de UUIDs
- `SCOPE_BRANCH_CODES` opcional, csv de códigos de sucursal
- `SCOPE_MODE` opcional: `replace` o `append`, default `replace`
- `SCOPE_ROLE_EXPECTED` opcional, default `BRANCH_ADMIN`

Ejemplo:

```bash
SCOPE_COMPANY_SLUG=almio \
SCOPE_EMAIL=manager@almio.cl \
SCOPE_BRANCH_CODES=CASA-MATRIZ,SUCURSAL-2 \
pnpm prisma:assign-branch-scopes
```

## Promoción temporal a SUPERADMIN

Para probar endpoints `admin` de Fase 1, existe un script auxiliar:

- `pnpm prisma:promote-superadmin`

Variables opcionales:

- `PROMOTE_EMAIL`
- `PROMOTE_COMPANY_SLUG`
