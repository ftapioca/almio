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
| SoW | alcance MVP, stack, fases y criterios de aceptación | `README.md`, `docs/adr/`, `apps/` | alineado hasta Fase 3 base |
| SDD | arquitectura, multi-tenancy, RBAC, offline, API, seguridad | `docs/adr/`, `apps/api/src/common/`, `docs/api/` | multi-tenancy y RBAC base operativos |
| SRS | requerimientos funcionales y no funcionales | `README.md`, `docs/api/`, futuros módulos | RRHH implementado; attendance y shifts en fase base validada |
| DocAPI | contratos REST, headers, responses y patrones de código | `docs/api/README.md`, `apps/api/src/` | health, admin, RRHH, attendance y shifts documentados y alineados al código |
| Cronograma | fases, tareas, hitos, entregables y runbooks | `README.md`, `docs/runbooks/`, `docs/adr/` | Fase 2 backend cerrada; Fase 3 backend en consolidación |

## Regla operativa

Cuando el código todavía no implementa una capacidad del baseline, la documentación interna debe marcarla como `planificada`, `borrador` o `pendiente`, nunca como `implementada`.

## Próximo foco documental

La documentación debería asumir mañana este orden:

1. tratar `branches/employees` como backend estabilizado
2. concentrar cambios nuevos en contratos y reglas de `attendance/shifts`
3. consolidar y extender la documentación de `branch_membership_scopes` sobre el endpoint admin ya expuesto
