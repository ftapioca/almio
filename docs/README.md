# Documentación Interna

Esta carpeta mantiene la trazabilidad entre los documentos base de Almio y el estado real del repositorio.

## Documentos base obligatorios

- `01 SoW - Almio.docx`: alcance, entregables, stack, aceptación MVP y fases.
- `02 SDD - Almio.docx`: arquitectura, multi-tenancy, módulos, seguridad, API y despliegue.
- `03 SRS - Almio.docx`: requerimientos funcionales y no funcionales.
- `04 DocAPI - Almio.docx`: convenciones de API, contratos y patrones de código.
- `05 Cronograma - Almio.docx`: fases, tareas, hitos y criterios de completitud.

## Matriz de trazabilidad inicial

| Documento base | Qué exige | Artefactos del repo relacionados | Estado actual |
| --- | --- | --- | --- |
| SoW | alcance MVP, stack, fases y criterios de aceptación | `README.md`, `docs/adr/`, `apps/` | alineado en Fase 0 |
| SDD | arquitectura, multi-tenancy, RBAC, offline, API, seguridad | `docs/adr/`, `apps/api/src/common/`, `docs/api/` | parcialmente scaffolded |
| SRS | requerimientos funcionales y no funcionales | `README.md`, `docs/api/`, futuros módulos | baseline documentado, no implementado aún |
| DocAPI | contratos REST, headers, responses y patrones de código | `docs/api/README.md`, `apps/api/src/` | convenciones definidas; solo `health` implementado |
| Cronograma | fases, tareas, hitos, entregables y runbooks | `README.md`, `docs/runbooks/`, `docs/adr/` | alineado a Fase 0 |

## Regla operativa

Cuando el código todavía no implementa una capacidad del baseline, la documentación interna debe marcarla como `planificada`, `borrador` o `pendiente`, nunca como `implementada`.
