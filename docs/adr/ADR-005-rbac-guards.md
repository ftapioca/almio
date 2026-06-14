# ADR-005: RBAC server-side con Guards por rol, local y tenant

- Estado: Borrador
- Fecha: 2026-06-14

## Contexto

La documentación exige control de acceso estricto por empresa, local, caja y rol, con enforcement server-side en todos los endpoints.

## Decisión propuesta

Implementar autorización en NestJS mediante:

- `AuthGuard`
- `RolesGuard`
- `BranchGuard`
- `TenantResolverMiddleware`
- `AuditInterceptor`

## Motivo

- Centraliza enforcement.
- Reduce bypasses por UI.
- Facilita pruebas negativas de autorización.

## Riesgos

- Complejidad al combinar contexto de tenant, branch y caja.
- Riesgo de endpoints sin guard si no se estandariza el scaffolding.

## Pendientes

- Matriz formal de permisos por rol.
- Reglas de acceso por superadmin vs owner vs branch admin.

