# Almio

Repositorio base del `Sistema SaaS para RRHH, Asistencia, Turnos, Caja y VentasPOS`.

## Fuente de verdad

Todo el proyecto debe mantenerse consistente con estos documentos base:

- `01 SoW - Almio.docx`
- `02 SDD - Almio.docx`
- `03 SRS - Almio.docx`
- `04 DocAPI - Almio.docx`
- `05 Cronograma - Almio.docx`

Si existe una diferencia entre código y documentación interna del repositorio, los documentos base mandan. La documentación en `docs/` debe reflejar tanto esa dirección objetivo como el estado real implementado.

## Alcance del MVP

El MVP está orientado a restaurantes pequeños y locales de comida rápida, con foco en:

- SaaS B2B multi-tenant para empresas con `1-5` locales y `5-25` colaboradores.
- RRHH, asistencia, turnos, POS, caja, inventario básico, pagos, comisiones y dashboards.
- Operación `offline-first` para POS y asistencia mediante PWA.
- Seguridad objetivo `OWASP ASVS Level 2`.

## Arquitectura objetivo

- Frontend / PWA: `Next.js 15` + `TypeScript` + `TailwindCSS` + `shadcn/ui`
- Backend API: `NestJS` + `TypeScript`
- ORM: `Prisma`
- Base de datos: `PostgreSQL` en `Supabase`
- Auth: `Supabase Auth`
- Storage: `Supabase Storage`
- Jobs / Colas: `Redis` + `BullMQ`
- Observabilidad: `Sentry` + `OpenTelemetry`
- Multi-tenancy: `schema por tenant` (`tenant_{company_slug}`)

## Estado real del repositorio

La repo ya cerró backend de `Fase 2 - Branches y Employees`, dejó estabilizado el tramo backend de `Fase 3 - Attendance y Shifts` y además cerró un primer bloque formal de `deploy readiness` para `apps/web` y `apps/api`.

Implementado hoy:

- monorepo `pnpm` con `apps/api` y `apps/web`
- backend NestJS con `TenantResolverMiddleware`, `AuthGuard`, `RolesGuard`, auditoría base y `GET /v1/health`
- Prisma operativo sobre Supabase para `schema public`
- seed de `SaaS Core` y provisioning tenant-aware con baseline versionado por schema
- endpoints funcionales:
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
  - `POST /v1/shifts/:id/publish`
  - `POST /v1/shifts/:id/cancel`
  - `POST /v1/shifts/:id/complete`
- scaffold Next.js 15 para portal SaaS / futura PWA
- backoffice web mínimo para `branch_membership_scopes` en `/backoffice/branch-scopes`
- auth web real con `Supabase Auth` para proteger el backoffice en `/auth/login`
- ADRs iniciales de multi-tenancy, offline y RBAC
- validación base del workspace: `typecheck`, `lint`, `test`, `build`
- workflow de CI para `lint`, `typecheck`, `test` y `build`
- runtime config inicial para despliegue:
  - `API_PORT` real en bootstrap de API
  - `API_CORS_ALLOWED_ORIGINS` para clientes web autorizados
  - `NEXT_PUBLIC_API_URL` obligatoria en web, sin fallback implícito a localhost
- observabilidad mínima inicial en API:
  - `x-request-id` por request
  - logs estructurados de request/response con duración, tenant y usuario
  - logs estructurados de excepciones no manejadas
- deploy readiness validado en Vercel:
  - `apps/api` desplegada y validada por `health/live` y `health/ready`
  - `apps/web` desplegada y validada con login real por `Supabase Auth`
  - `pnpm prisma:migrate:release` ejecutado sobre el entorno actual
  - backoffice `/backoffice/branch-scopes` operativo en producción
- cierre explícito de autenticación:
  - el login operativo vive en `Supabase Auth`
  - el backend Almio no expone hoy endpoints propios `login|logout|refresh`
  - la API valida JWT emitidos por Supabase y aplica RBAC/tenant resolution server-side
- endurecimiento de autorización RRHH:
  - sin membership activa en el tenant no se heredan roles de RRHH desde claims
  - `OWNER` y `SUPERADMIN` pueden administrar catálogo de locales
  - `BRANCH_ADMIN` queda restringido a sus sucursales asignadas para lecturas y gestión de colaboradores, asistencia y turnos
- pruebas e2e HTTP para autorización negativa y aislamiento tenant en RRHH
- validación real de login/consumo con `Supabase Auth` usando `branch-admin@almio.cl`
- reglas de negocio iniciales ya activas:
  - `attendance`: secuencia válida `CHECK_IN -> BREAK_START|CHECK_OUT -> BREAK_END -> CHECK_OUT`
  - `shifts`: prevención de traslapes por colaborador y transición de estados básica
- contrato estabilizado de `attendance`:
  - `POST /v1/attendance` exige `Idempotency-Key`
  - replay idempotente devuelve el mismo registro para la misma key/payload
- contrato estabilizado de `shifts`:
  - `PATCH /v1/shifts/:id` ya no cambia `status`
  - las transiciones viven sólo en `publish`, `cancel` y `complete`
- tenant migrations aplicadas en el entorno actual para activar idempotencia de `attendance`

Pendiente para próximas fases:

- POS, menú, inventario, pagos y dashboards
- SAST, observabilidad externa, backups y hardening adicional

## Próxima sesión recomendada

Para continuar sin perder contexto, el siguiente orden de trabajo recomendado es:

1. abrir UI funcional de `attendance` usando el contrato ya fijado:
   - respetar `Idempotency-Key`
   - no reabrir decisiones de secuencia ni estados
2. seguir con UI funcional de `shifts`:
   - usar comandos explícitos `publish`, `cancel` y `complete`
   - mantener fuera de la UI cualquier cambio directo de `status`
3. después consolidar el shell/backoffice general:
   - navegación operativa
   - capas compartidas de auth, tenant y sucursal activa

Checklist formal del bloque de despliegue:

- [docs/deploy-readiness-checklist.md](/Users/ftapioca/Projects/Almio/almio/docs/deploy-readiness-checklist.md)

## Cierre de Fase 1

Se considera cerrado para esta repo el alcance base de `SaaS Core + Seguridad`:

- `schema public` operativo en Supabase
- seed y provisioning tenant-aware
- auth server-side por validación de JWT de `Supabase Auth`
- tenant resolver real por `Company`
- RBAC base y auditoría SaaS
- CI mínima del monorepo

Decisión operativa vigente:

- el flujo de autenticación de usuarios finales depende de `Supabase Auth`
- cualquier UI o cliente que necesite sesión debe obtener el token desde Supabase y luego consumir Almio con `Authorization: Bearer <jwt>`
- mientras no exista un requerimiento nuevo en SoW/SDD, no se crearán endpoints duplicados `login|logout|refresh` en `apps/api`

## Estructura

```text
apps/
  api/        API NestJS
  web/        Portal SaaS / futura PWA
docs/
  adr/        Architecture Decision Records
  api/        Documentación viva de API y contratos
  runbooks/   Operación, deploy, rollback e incidentes
```

## Reglas de consistencia

- Ningún documento interno debe afirmar que un módulo está implementado si aún no existe en código.
- Todo endpoint nuevo debe documentarse en `docs/api/` antes de merge.
- Toda decisión de arquitectura relevante debe registrarse en `docs/adr/`.
- Todo avance debe respetar el SoW, SDD, SRS, DocAPI y Cronograma como baseline.
- El cierre de backend de `Fase 3` y el corte previo a UI funcional quedan resumidos en `docs/phase-3-readiness.md`.
