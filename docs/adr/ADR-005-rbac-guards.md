# ADR-005: RBAC server-side con Guards por rol, local y tenant

- Estado: Aceptada
- Fecha: 2026-06-14

## Contexto

La documentación exige control de acceso estricto por empresa, local, caja y rol, con enforcement server-side en todos los endpoints.

## Decisión

Implementar autorización en NestJS mediante:

- `AuthGuard`
- `RolesGuard`
- `TenantResolverMiddleware`
- `AuditInterceptor`

Y complementar el enforcement de RRHH con reglas de servicio:

- para endpoints tenant-scoped, los roles operativos (`OWNER`, `BRANCH_ADMIN`) se resuelven desde `company_memberships`
- si no existe membership activa para el tenant, no se heredan roles operativos desde claims JWT
- `SUPERADMIN` puede mantenerse como excepción global vía claims
- `BRANCH_ADMIN` queda acotado por `public.branch_membership_scopes`
- `branches`:
  - `GET` por listado y detalle: `SUPERADMIN | OWNER | BRANCH_ADMIN`
  - `POST` y `PATCH`: `SUPERADMIN | OWNER`
- `employees`:
  - `GET`, `POST`, `PATCH`: `SUPERADMIN | OWNER | BRANCH_ADMIN`
  - cuando actúa `BRANCH_ADMIN`, sólo puede leer o mutar colaboradores de sus sucursales asignadas

## Motivo

- Centraliza enforcement.
- Reduce bypasses por UI.
- Facilita pruebas negativas de autorización.
- Evita que claims globales otorguen acceso tenant sin membership activa.
- Permite reutilizar el mismo patrón de scope para `attendance` y `shifts`.

## Riesgos

- Complejidad al combinar contexto de tenant, branch y caja.
- Riesgo de endpoints sin guard si no se estandariza el scaffolding.
- Necesidad de mantener sincronizadas las asignaciones en `branch_membership_scopes`.

## Consecuencias

- Fase 3 debe nacer ya sobre el mismo modelo de scope por sucursal.
- Sigue pendiente un flujo administrativo para asignar scopes de `BRANCH_ADMIN`.
