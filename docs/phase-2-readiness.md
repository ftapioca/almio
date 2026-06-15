# Fase 2 Readiness

Checklist de cierre para `branches` y `employees`, derivado de `SoW`, `SDD`, `SRS`, `DocAPI` y `Cronograma`.

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

## Endurecimientos completados

- sin membership activa en el tenant no se heredan roles operativos de RRHH desde claims JWT
- `BRANCH_ADMIN` usa scopes explícitos por sucursal en `public.branch_membership_scopes`
- `BRANCH_ADMIN` puede leer sólo sucursales y colaboradores dentro de su alcance
- `BRANCH_ADMIN` no puede crear ni editar catálogo de sucursales
- pruebas e2e HTTP cubren:
  - `403` sin membership activa
  - `403` para acciones negativas de `BRANCH_ADMIN`
  - aislamiento básico entre tenants

## Riesgos a controlar en Fase 2

- drift entre provisioning baseline y contratos reales de `branches` y `employees`
- gestión operativa de asignaciones en `branch_membership_scopes` mientras no exista UI/admin específico
- necesidad de reutilizar el mismo patrón de scopes en `attendance` y `shifts`

## Próximos pasos sugeridos

1. Reutilizar `branch_membership_scopes` en `attendance` y `shifts` desde el primer endpoint.
2. Definir endpoint o flujo admin para asignar y revocar scopes de `BRANCH_ADMIN`.
3. Extender pruebas e2e a casos de escritura reales con base de datos de integración.
4. Extender auditoría tenant a lecturas sensibles si el SRS lo exige.

## Estado posterior

- `attendance` y `shifts` ya arrancaron reutilizando el mismo scope por sucursal
- el flujo operativo actual para scopes es script-based vía `pnpm prisma:assign-branch-scopes`
