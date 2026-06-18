# ADR-004: Estrategia de migraciones por tenant

- Estado: Aceptada
- Fecha: 2026-06-14

## Contexto

La arquitectura aprobada usa `schema por tenant`. El SDD exige que las migraciones se ejecuten contra `public` y todos los `tenant_{slug}` de forma controlada y versionada.

## Decisión

Separar las migraciones en dos capas:

- migraciones globales para `public`
- migraciones tenant-aware aplicables a todos los schemas de empresa

Orden operativo aprobado para deploy:

1. desplegar la nueva versión de `apps/api`
2. ejecutar migraciones `public`
3. ejecutar migraciones tenant sobre todas las empresas activas
4. correr smoke checks de API y auth web

Implementación actual:

- `pnpm prisma:migrate:deploy` para `schema public`
- `pnpm prisma:migrate:tenants` para tenants existentes
- `pnpm prisma:migrate:release` como secuencia consolidada `public -> tenants`

## Motivo

- Mantiene claridad entre SaaS Core y dominio operativo por tenant.
- Facilita provisioning de nuevas empresas.
- Permite versionar cambios de esquema sin romper tenants existentes.

## Riesgos

- Drift entre tenants si falla una ejecución parcial.
- Mayor complejidad operativa en rollback.

## Consecuencias

- El proceso de release debe tratar las tenant migrations como parte obligatoria del deploy.
- Si una tenant migration falla, el release queda incompleto y requiere evaluación antes de continuar con más cambios.
- Nuevas empresas siguen heredando el baseline mediante provisioning y las existentes se alinean con `pnpm prisma:migrate:release`.

## Pendientes

- procedimiento detallado de rollback y reintentos
- backups y restore por tenant antes de beta cerrada
