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
| SoW | alcance MVP, stack, fases y criterios de aceptación | `README.md`, `docs/adr/`, `apps/` | alineado hasta cierre backend de Fase 3 y auth web real |
| SDD | arquitectura, multi-tenancy, RBAC, offline, API, seguridad | `docs/adr/`, `apps/api/src/common/`, `docs/api/` | multi-tenancy y RBAC base operativos |
| SRS | requerimientos funcionales y no funcionales | `README.md`, `docs/api/`, futuros módulos | RRHH backend cerrado; attendance y shifts con contratos estabilizados |
| DocAPI | contratos REST, headers, responses y patrones de código | `docs/api/README.md`, `apps/api/src/` | health, admin, RRHH, attendance y shifts documentados y alineados al código |
| Cronograma | fases, tareas, hitos, entregables y runbooks | `README.md`, `docs/runbooks/`, `docs/adr/` | Fase 2 backend cerrada; Fase 3 backend estabilizada; siguiente bloque: UI funcional |

## Regla operativa

Cuando el código todavía no implementa una capacidad del baseline, la documentación interna debe marcarla como `planificada`, `borrador` o `pendiente`, nunca como `implementada`.

## Corte documental vigente

- `docs/phase-3-readiness.md` consolida el cierre backend de `attendance/shifts`, auth web real y el punto exacto desde el que conviene abrir UI funcional.
- `docs/runbooks/README.md` sigue marcando runbooks como pendientes y no debe adelantarlos como implementados.

## Próximo foco documental

La documentación debería asumir ahora este orden:

1. tratar `attendance/shifts` como contratos backend fijados
2. documentar la UI funcional de asistencia sólo cuando exista código real
3. mantener `branch_membership_scopes` como capacidad operativa ya disponible por API y backoffice mínimo
