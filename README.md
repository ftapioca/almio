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

La repo quedó lista para iniciar `Fase 2 - Branches y Employees`.

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
- scaffold Next.js 15 para portal SaaS / futura PWA
- ADRs iniciales de multi-tenancy, offline y RBAC
- validación base del workspace: `typecheck`, `lint`, `test`, `build`
- workflow de CI para `lint`, `typecheck`, `test` y `build`
- cierre explícito de autenticación:
  - el login operativo vive en `Supabase Auth`
  - el backend Almio no expone hoy endpoints propios `login|logout|refresh`
  - la API valida JWT emitidos por Supabase y aplica RBAC/tenant resolution server-side

Pendiente para próximas fases:

- módulos SaaS Core, RRHH, Asistencia, Turnos, POS, Menú, Inventario, Pagos y Dashboards
- SAST, observabilidad, backups, runbooks y hardening

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
