# API Docs

Documentación viva de la API de Almio, alineada con `04 DocAPI - Almio.docx` y el `SDD`.

## Reglas de consistencia

- Todo endpoint implementado debe documentarse antes de merge a `main`.
- La documentación debe reflejar el código real del repositorio, no el deseado.
- Los módulos no implementados deben figurar como `planificados` o `pendientes`.
- Los ejemplos contractuales deben respetar `Bearer JWT`, `X-Tenant-ID` e `Idempotency-Key` donde aplique.

## Convenciones base

- Base URL dev: `http://localhost:3001/v1`
- Formato: `application/json`
- Versionamiento: path `/v1`
- Auth objetivo: `Authorization: Bearer <jwt>`
- Tenant objetivo: `X-Tenant-ID: <company_slug>`
- Idempotencia objetivo para offline: `Idempotency-Key: <uuid>`

Respuesta exitosa estándar:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Respuesta de error estándar:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensaje",
    "details": []
  }
}
```

## Estado actual del código

Implementado hoy:

- `GET /v1/health`
- `GET /v1/me`
- `GET /v1/me/owner`
- `GET /v1/admin/companies`
- `GET /v1/admin/companies/:slug`
- `POST /v1/admin/companies`
- `GET /v1/admin/plans`

Planificado según documentos base:

- `/v1/auth`
- `/v1/admin`
- `/v1/branches`
- `/v1/employees`
- `/v1/attendance`
- `/v1/shifts`
- `/v1/pos/sales`
- `/v1/cash-sessions`
- `/v1/inventory`
- `/v1/payments`
- `/v1/dashboards`
- `/v1/sync`

## Endpoint implementado

### `GET /v1/health`

Uso:

- healthcheck básico del backend
- no requiere `Authorization`
- no requiere `X-Tenant-ID`

Respuesta actual:

```json
{
  "success": true,
  "data": {
    "service": "almio-api",
    "status": "ok"
  }
}
```

### `GET /v1/admin/companies`

Uso:

- listado paginado de empresas del SaaS Core
- requiere `Authorization: Bearer <jwt>`
- requiere rol efectivo `SUPERADMIN`
- hoy se usa junto a `X-Tenant-ID` por el flujo actual del middleware

Query params:

- `page` default `1`
- `limit` default `20`, max `100`
- `status` opcional: `ACTIVE | SUSPENDED | CANCELLED`

### `GET /v1/admin/companies/:slug`

Uso:

- obtiene el detalle de una empresa por `slug`
- requiere `Authorization`
- requiere rol `SUPERADMIN`

### `POST /v1/admin/companies`

Uso:

- crea empresa, `subscription`, owner local y ejecuta provisioning del tenant
- requiere `Authorization`
- requiere rol `SUPERADMIN`

Payload actual:

```json
{
  "name": "Nueva Empresa",
  "slug": "nueva-empresa",
  "planId": "uuid-del-plan",
  "country": "CL",
  "currency": "CLP",
  "ownerEmail": "owner@empresa.cl"
}
```

Provisioning actual del tenant:

- `CREATE SCHEMA IF NOT EXISTS tenant_{slug}`
- `tenant_migrations`
- `tenant_settings`
- `branches`
- `employees`
- `audit_log_tenant`

### `GET /v1/admin/plans`

Uso:

- listado paginado de planes SaaS disponibles
- requiere `Authorization`
- requiere rol `SUPERADMIN`

Query params:

- `page` default `1`
- `limit` default `20`, max `100`

## Trabajo pendiente por Fase

- Fase 1: `auth`, `admin` create/list/read, `admin/plans`, tenant resolver real, RBAC, auditoría, tenant provisioning baseline
- Fase 2: `branches`, `employees`
- Fase 3: `attendance`, `shifts`
- Fase 4: `pos`, `cash-sessions`, `sync`
- Fase 5: `menu`, `inventory`
- Fase 6: `payments`, `commissions`, `dashboards`, `exports`
