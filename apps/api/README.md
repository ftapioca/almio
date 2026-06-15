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
- `TenantResolverMiddleware` real por `Company`
- `AuthGuard` real con JWT de Supabase
- `RolesGuard`
- auditoría SaaS persistente
- `ValidationPipe` global

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

## Nota de consistencia

El backend todavía no implementa módulos de negocio del SRS. La documentación en `docs/api/` debe tratarlos como planificados hasta que existan en código.
