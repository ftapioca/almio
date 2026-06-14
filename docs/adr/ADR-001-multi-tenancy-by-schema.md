# ADR-001: Multi-tenancy por schema PostgreSQL

- Estado: Aprobado
- Fecha: 2026-06-14

## Contexto

El producto debe operar como SaaS B2B multi-tenant para restaurantes pequeños, con aislamiento fuerte entre empresas, escalabilidad inicial de hasta 100 tenants y posibilidad de exportación/restore por cliente.

## Decisión

Usar `schema por tenant` en PostgreSQL.

- `public`: datos globales SaaS.
- `tenant_{company_slug}`: datos operativos por empresa.

## Motivo

- Mejor aislamiento lógico que un modelo de `tenant_id` simple.
- Facilita backups/export por empresa.
- Reduce riesgo de fuga cruzada de datos.
- Calza con SoW, SDD y SRS como decisión explícita.

## Alternativas consideradas

1. Base de datos por cliente.
2. Tabla compartida con `tenant_id`.

## Riesgos

- Migraciones multi-schema más complejas.
- Mayor disciplina operativa en provisioning y cambios de esquema.

## Consecuencias

- Se requiere `TenantResolver` por request.
- Se deben diseñar scripts/migraciones tenant-aware.
- Deben existir pruebas automáticas de tenant isolation antes de beta.

