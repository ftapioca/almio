# Fase 1 Readiness

Checklist operativo derivado de `SoW`, `SDD`, `SRS`, `DocAPI` y `Cronograma`.

## Objetivo de la fase

Entregar `SaaS Core + Seguridad` con:

- auth base con Supabase Auth
- RBAC server-side
- tenant resolver real
- modelo global SaaS en `schema public`
- auditoría base
- baseline de CI/CD y DevSecOps

## Qué ya quedó preparado en la repo

- scaffold NestJS modular para `auth`, `admin`, `audit` y `prisma`
- modelo Prisma ampliado para `SaaSPlan`, `Company`, `Subscription`, `UserAccount`, `CompanyMembership`, `Country`, `Currency` y `AuditLogSaaS`
- cliente Prisma generado localmente desde el schema actual
- migración inicial de `schema public` aplicada en Supabase
- seed base de `SaaS Core` aplicado en Supabase
- `AuthGuard` real con validación JWT por Supabase JWKS
- `TenantResolver` real por `Company`
- endpoints funcionales:
  - `GET /v1/me`
  - `GET /v1/me/owner`
  - `GET /v1/admin/companies`
  - `GET /v1/admin/companies/:slug`
  - `POST /v1/admin/companies`
- prueba end-to-end validada para auth, tenant resolution y creación de empresa
- ADRs base requeridos por el SDD
- decisión explícita de que el login operativo depende de `Supabase Auth`
- documentación interna alineada al estado real de Fase 1

## Estado de cierre

Fase 1 queda cerrada para esta repo con la siguiente decisión operativa:

- `Supabase Auth` es la única fuente de login, logout y refresh de sesión
- Almio API no duplica ese flujo con endpoints propios mientras no exista un requerimiento nuevo

## Siguiente secuencia recomendada

1. Incorporar SAST básico según cronograma.
2. Empezar Fase 2 sobre `branches` y `employees`, aprovechando el baseline tenant ya provisionado.
3. Agregar tests automáticos de tenant isolation antes de beta.

## Restricción importante

No avanzar a RRHH o POS antes de tener resuelto:

- tenant isolation base
- auth server-side
- modelo global SaaS
- trazabilidad de auditoría
