# ADR-004: Estrategia de migraciones por tenant

- Estado: Borrador
- Fecha: 2026-06-14

## Contexto

La arquitectura aprobada usa `schema por tenant`. El SDD exige que las migraciones se ejecuten contra `public` y todos los `tenant_{slug}` de forma controlada y versionada.

## Decisión propuesta

Separar las migraciones en dos capas:

- migraciones globales para `public`
- migraciones tenant-aware aplicables a todos los schemas de empresa

## Motivo

- Mantiene claridad entre SaaS Core y dominio operativo por tenant.
- Facilita provisioning de nuevas empresas.
- Permite versionar cambios de esquema sin romper tenants existentes.

## Riesgos

- Drift entre tenants si falla una ejecución parcial.
- Mayor complejidad operativa en rollback.

## Pendientes

- herramienta exacta de ejecución
- estrategia de versionado por schema
- procedimiento de rollback y reintentos
