# API

Scaffold NestJS de `Fase 0`, alineado con SoW, SDD, SRS, DocAPI y Cronograma.

## Implementado hoy

- `GET /v1/health`
- `TenantResolverMiddleware` base
- `RolesGuard`
- `AuditInterceptor` base
- `ValidationPipe` global

## Objetivos de Fase 0 y Fase 1

- conectar Prisma con Supabase/PostgreSQL
- implementar `TenantResolver` real con validación de empresa y `search_path`
- incorporar auth real con Supabase Auth
- modelar `schema public` para SaaS Core
- agregar `AuthGuard`, `BranchGuard` y auditoría persistente

## Nota de consistencia

El backend todavía no implementa módulos de negocio del SRS. La documentación en `docs/api/` debe tratarlos como planificados hasta que existan en código.
