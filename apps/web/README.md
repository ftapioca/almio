# Web

Scaffold Next.js 15 del portal SaaS y futura PWA `offline-first`.

## Implementado hoy

- layout base del portal
- landing interna de `Fase 0`
- setup inicial de TailwindCSS
- backoffice mínimo en `/backoffice/branch-scopes` para consultar y reemplazar `branch_membership_scopes`
- auth web real con `Supabase Auth` en `/auth/login`
- protección server-side del backoffice usando sesión Supabase
- carga automática del `Bearer token` de sesión dentro de la consola de scopes
- base lista para abrir UI funcional de `attendance` y `shifts` sin rehacer auth ni wiring de sesión

## Objetivos de las siguientes fases

- shell de administración SaaS
- base de PWA, service worker e IndexedDB
- UI operativa de RRHH, asistencia, turnos, POS y dashboards por fase

## Nota de consistencia

La app web actual ya tiene auth real y un backoffice mínimo, pero todavía no debe presentarse como módulo operativo de asistencia, turnos o POS hasta que exista esa UI en código.
