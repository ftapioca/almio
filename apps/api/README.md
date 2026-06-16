# API

Backend NestJS alineado con SoW, SDD, SRS, DocAPI y Cronograma.

## Implementado hoy

- `GET /v1/health`
- `GET /v1/me`
- `GET /v1/me/owner`
- `GET /v1/admin/companies`
- `GET /v1/admin/companies/:slug`
- `POST /v1/admin/companies`
- `GET /v1/admin/plans`
- `GET /v1/admin/branch-membership-scopes`
- `PUT /v1/admin/branch-membership-scopes/:membershipId`
- `GET /v1/branches`
- `POST /v1/branches`
- `GET /v1/branches/:id`
- `PATCH /v1/branches/:id`
- `GET /v1/employees`
- `POST /v1/employees`
- `GET /v1/employees/:id`
- `PATCH /v1/employees/:id`
- `GET /v1/attendance`
- `POST /v1/attendance`
- `GET /v1/attendance/:id`
- `PATCH /v1/attendance/:id`
- `GET /v1/shifts`
- `POST /v1/shifts`
- `GET /v1/shifts/:id`
- `PATCH /v1/shifts/:id`
- `TenantResolverMiddleware` real por `Company`
- `AuthGuard` real con JWT de Supabase
- `RolesGuard`
- `AuthorizationService` con scopes por sucursal para `BRANCH_ADMIN`
- auditoría SaaS persistente
- auditoría tenant para escrituras de `branches` y `employees`
- `ValidationPipe` global
- e2e HTTP para `403` y aislamiento tenant en RRHH
- scripts de login y consumo real con `Supabase Auth` para validar `BRANCH_ADMIN`
- reglas de negocio endurecidas en `attendance` y `shifts`

## Cierre operativo de Fase 1

- Prisma conectado a Supabase/PostgreSQL
- `schema public` de SaaS Core aplicado
- provisioning tenant-aware versionado
- validación server-side de JWT emitidos por `Supabase Auth`
- tenant resolution y RBAC base operativos

## Decisión explícita sobre autenticación

- El login operativo vive solo en `Supabase Auth`.
- `apps/api` no expone hoy endpoints propios `login`, `logout` ni `refresh`.
- La responsabilidad del backend Almio es:
  - validar el JWT recibido
  - resolver tenant
  - aplicar RBAC y auditoría
- La responsabilidad del frontend o cliente es:
  - iniciar sesión contra Supabase
  - refrescar sesión usando el SDK de Supabase
  - enviar `Authorization: Bearer <jwt>` a Almio

## Estrategia tenant actual

- `schema public`: Prisma ORM para SaaS Core
- `schema tenant_*`: SQL directo encapsulado en `TenantDatabaseService`
- validación estricta de nombres de schema antes de interpolar SQL
- tablas operativas iniciales:
  - `tenant_settings`
  - `branches`
  - `employees`
  - `audit_log_tenant`
- tabla pública adicional para RRHH:
  - `branch_membership_scopes`
- tablas tenant iniciales de Fase 3:
  - `attendance_records`
  - `shifts`

## Validación real ya ejecutada

- existe un usuario real `branch-admin@almio.cl` en `almio` con rol `BRANCH_ADMIN`
- ese usuario ya fue validado contra la API local usando JWT emitido por Supabase
- los endpoints `branches`, `employees`, `attendance` y `shifts` ya respondieron `200` dentro de scope
- también se validaron por HTTP real:
  - secuencia inválida de `attendance` con respuesta `400`
  - traslape de `shifts` con respuesta `400`

## Próximo checkpoint recomendado

1. definir si las transiciones de `shifts` seguirán en `PATCH` genérico o pasarán a comandos explícitos `publish|cancel|complete`
2. decidir si `attendance` requerirá `Idempotency-Key` antes del tramo offline-first
3. definir si `GET|PUT /v1/admin/branch-membership-scopes` tendrá backoffice/UI dedicado
4. iniciar la capa web sólo después de fijar esos contratos

## Nota de consistencia

El backend todavía no implementa módulos de negocio del SRS. La documentación en `docs/api/` debe tratarlos como planificados hasta que existan en código.
