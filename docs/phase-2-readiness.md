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

## Scope recomendado para abrir Fase 2

1. `GET /v1/branches`
2. `POST /v1/branches`
3. `GET /v1/branches/:id`
4. `PATCH /v1/branches/:id`
5. `GET /v1/employees`
6. `POST /v1/employees`
7. `GET /v1/employees/:id`
8. `PATCH /v1/employees/:id`

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

## Primeros pasos sugeridos

1. Definir DTOs y contratos REST de `branches`.
2. Elegir estrategia de acceso a schemas tenant desde Prisma o SQL directo encapsulado.
3. Implementar CRUD mínimo de `branches`.
4. Repetir patrón para `employees`.
