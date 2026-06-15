# Fase 2 Readiness

Checklist de arranque para `branches` y `employees`, derivado de `SoW`, `SDD`, `SRS`, `DocAPI` y `Cronograma`.

## Precondiciones ya resueltas

- `schema public` de SaaS Core operativo en Supabase
- tenant provisioning baseline aplicado sobre schemas existentes
- `tenant_settings`, `branches`, `employees` y `audit_log_tenant` creados en cada tenant nuevo
- `AuthGuard`, `TenantResolver` y `RolesGuard` operativos
- auditoría SaaS persistente para acciones admin
- CI mínima disponible en GitHub Actions
- decisión explícita de auth:
  - login, logout y refresh viven en `Supabase Auth`
  - la API Almio consume JWTs ya emitidos

## Scope ya implementado en este arranque de Fase 2

1. `GET /v1/branches`
2. `POST /v1/branches`
3. `GET /v1/branches/:id`
4. `PATCH /v1/branches/:id`
5. `GET /v1/employees`
6. `POST /v1/employees`
7. `GET /v1/employees/:id`
8. `PATCH /v1/employees/:id`

## Estrategia elegida para acceso tenant

- Prisma sigue siendo la capa principal para `schema public`.
- Para data operativa por tenant se usa `SQL directo encapsulado` sobre Prisma raw queries.
- El acceso pasa por `TenantDatabaseService`, que:
  - valida `schemaName` con whitelist estricta
  - interpola sólo schemas `tenant_*`
  - evita mezclar tablas tenant con `public`
- Esta decisión minimiza drift mientras todavía no existe un segundo schema Prisma específico por tenant.

## Reglas de implementación

- todas las operaciones deben ejecutarse dentro del schema del tenant resuelto
- no se debe mezclar data operativa tenant con `schema public`
- todo endpoint nuevo debe documentarse en `docs/api/README.md`
- toda acción de escritura debe dejar traza de auditoría correspondiente
- antes de merge, validar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`

## Riesgos a controlar en Fase 2

- drift entre provisioning baseline y contratos reales de `branches` y `employees`
- ausencia de tests automáticos de tenant isolation
- definición incompleta de permisos finos por rol para RRHH

## Próximos pasos sugeridos

1. Completar pruebas end-to-end de `branches` y `employees` con datos reales.
2. Definir permisos finos por rol para RRHH.
3. Evaluar si `BranchGuard` debe entrar ya en Fase 2 o quedar para Fase 3.
4. Extender auditoría tenant a lecturas sensibles si el SRS lo exige.
