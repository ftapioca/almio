# Runbooks

Runbooks operativos requeridos por el `SDD`, `SRS` y `Cronograma`.

## Estado actual

La repo ya cerró la base de `Fase 2`, estabilizó backend de `Fase 3` y habilitó auth web real para backoffice. Además, ya existe una base mínima operativa para despliegue:

- [deploy.md](/Users/ftapioca/Projects/Almio/almio/docs/runbooks/deploy.md)
- [rollback.md](/Users/ftapioca/Projects/Almio/almio/docs/runbooks/rollback.md)
- [smoke-checks.md](/Users/ftapioca/Projects/Almio/almio/docs/runbooks/smoke-checks.md)
- [vercel.md](/Users/ftapioca/Projects/Almio/almio/docs/runbooks/vercel.md)
- [../deploy-readiness-checklist.md](/Users/ftapioca/Projects/Almio/almio/docs/deploy-readiness-checklist.md)

Siguen pendientes los runbooks de operación más profundos y el detalle por proveedor de infraestructura.

## Runbooks requeridos

- deploy
- rollback
- smoke checks post deploy
- incident response
- backups y restore por tenant
- rotación de secretos
- fallas de sincronización offline
- fallas de migraciones multi-tenant
- recuperación ante errores de auth o expiración masiva de sesiones

## Hito documental esperado

Según el cronograma base, los runbooks deben quedar documentados de forma operativa en `Fase 7`, antes de la beta cerrada.
