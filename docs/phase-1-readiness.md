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
- ADRs base requeridos por el SDD
- documentación interna alineada al estado real de Fase 0

## Siguiente secuencia recomendada

1. Conectar `PrismaService` a Supabase real y preparar migración inicial de `schema public`.
2. Implementar `AuthGuard` y validación real de JWT emitido por Supabase.
3. Reemplazar el `TenantResolverMiddleware` placeholder por resolución real de `Company`.
4. Crear endpoints iniciales de `admin/companies` y `auth/login|logout|refresh`.
5. Persistir `AuditLogSaaS` en acciones críticas.
6. Agregar CI mínima con `lint`, `typecheck`, `test` y `build`.
7. Incorporar SAST básico según cronograma.

## Restricción importante

No avanzar a RRHH o POS antes de tener resuelto:

- tenant isolation base
- auth server-side
- modelo global SaaS
- trazabilidad de auditoría
