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
- `GET /v1/admin/branch-membership-scopes`
- `PUT /v1/admin/branch-membership-scopes/:membershipId`
- `GET /v1/branches`
- `POST /v1/branches`
- `GET /v1/branches/:id`
- `PATCH /v1/branches/:id`
- `GET /v1/employees`
- `POST /v1/employees`
- `GET /v1/employees/:id`
- `PATCH /v1/employees/:id`
- `GET /v1/attendance`
- `POST /v1/attendance`
- `GET /v1/attendance/:id`
- `PATCH /v1/attendance/:id`
- `GET /v1/shifts`
- `POST /v1/shifts`
- `GET /v1/shifts/:id`
- `PATCH /v1/shifts/:id`
- `POST /v1/shifts/:id/publish`
- `POST /v1/shifts/:id/cancel`
- `POST /v1/shifts/:id/complete`

Decisión explícita de autenticación vigente:

- el login operativo vive en `Supabase Auth`
- Almio API no expone hoy `/v1/auth/login`, `/v1/auth/logout` ni `/v1/auth/refresh`
- los clientes deben autenticarse con Supabase y consumir Almio con el JWT emitido por Supabase

Planificado según documentos base:

- `/v1/auth`
- `/v1/pos/sales`
- `/v1/cash-sessions`
- `/v1/inventory`
- `/v1/payments`
- `/v1/dashboards`
- `/v1/sync`

## Endpoint implementado

### Autenticación operativa actual

Estado:

- no existe hoy un módulo REST propio de login en `apps/api`
- el contrato real implementado es `JWT de Supabase -> Authorization Bearer -> validación server-side en Almio`

Implicancias:

- cualquier ejemplo de consumo debe asumir un token emitido por Supabase
- `/v1/auth` permanece como `planificado` hasta que exista una necesidad funcional distinta del flujo nativo de Supabase

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

### `GET /v1/admin/branch-membership-scopes`

Uso:

- obtiene los scopes actuales de sucursal para un `company_membership` del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER`
- el `membershipId` debe pertenecer al tenant actual y tener rol `BRANCH_ADMIN`

Query params:

- `membershipId` requerido

### `PUT /v1/admin/branch-membership-scopes/:membershipId`

Uso:

- reemplaza completamente los scopes de sucursal para un `company_membership`
- cubre alta, revocación y reemplazo en una sola operación
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER`
- valida que todas las sucursales existan en el tenant actual

Payload actual:

```json
{
  "branchIds": [
    "uuid-branch-1",
    "uuid-branch-2"
  ]
}
```

### `GET /v1/branches`

Uso:

- listado paginado de locales del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, la respuesta se restringe a las sucursales asignadas en `branch_membership_scopes`

Query params:

- `page` default `1`
- `limit` default `20`, max `100`
- `status` opcional: `ACTIVE | INACTIVE`

### `POST /v1/branches`

Uso:

- crea un local dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER`
- deja traza en `audit_log_tenant`

Payload actual:

```json
{
  "code": "CASA-MATRIZ",
  "name": "Casa Matriz",
  "status": "ACTIVE",
  "timezone": "America/Santiago"
}
```

### `GET /v1/branches/:id`

Uso:

- obtiene un local por `id` dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, el `id` debe pertenecer a una sucursal asignada o responde `403`

### `PATCH /v1/branches/:id`

Uso:

- actualiza un local por `id` dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER`
- deja traza en `audit_log_tenant`

### `GET /v1/employees`

Uso:

- listado paginado de colaboradores del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, la respuesta se restringe a colaboradores de sus sucursales asignadas

Query params:

- `page` default `1`
- `limit` default `20`, max `100`
- `status` opcional: `ACTIVE | INACTIVE`
- `branchId` opcional

### `POST /v1/employees`

Uso:

- crea un colaborador dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- deja traza en `audit_log_tenant`
- si actúa `BRANCH_ADMIN`, `branchId` es obligatorio y debe pertenecer a su scope

Payload actual:

```json
{
  "branchId": "uuid-opcional",
  "firstName": "Felipe",
  "lastName": "Tapioca",
  "email": "felipe@almio.cl",
  "phone": "+56911111111",
  "status": "ACTIVE"
}
```

### `GET /v1/employees/:id`

Uso:

- obtiene un colaborador por `id` dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, el colaborador debe pertenecer a una sucursal asignada o responde `403`

### `PATCH /v1/employees/:id`

Uso:

- actualiza un colaborador por `id` dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- deja traza en `audit_log_tenant`
- si actúa `BRANCH_ADMIN`, el colaborador actual y el `branchId` destino deben pertenecer a su scope

### `GET /v1/attendance`

Uso:

- listado paginado de marcaciones del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, la respuesta se restringe a sus sucursales asignadas

Query params:

- `page` default `1`
- `limit` default `20`, max `100`
- `branchId` opcional
- `employeeId` opcional
- `eventType` opcional: `CHECK_IN | CHECK_OUT | BREAK_START | BREAK_END`
- `from` opcional
- `to` opcional

Regla de negocio ya activa:

- no se permiten secuencias inválidas de eventos por colaborador
- al insertar o editar un evento también se valida que no rompa la transición con el evento siguiente

### `POST /v1/attendance`

Uso:

- crea una marcación dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere `Idempotency-Key: <uuid>`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- deja traza en `audit_log_tenant`
- si actúa `BRANCH_ADMIN`, `branchId` debe pertenecer a su scope

Payload actual:

```json
{
  "branchId": "uuid-branch",
  "employeeId": "uuid-employee",
  "eventType": "CHECK_IN",
  "eventAt": "2026-06-15T12:00:00.000Z",
  "source": "MANUAL",
  "notes": "Ingreso manual"
}
```

La API rechaza hoy, por ejemplo, un segundo `CHECK_IN` consecutivo o un `CHECK_OUT` insertado antes de un `BREAK_START` ya existente.

Regla de idempotencia activa:

- si se reintenta el mismo `POST /v1/attendance` con el mismo `Idempotency-Key` y el mismo payload, la API devuelve la misma marcación
- si el `Idempotency-Key` ya existe pero con payload distinto, la API responde conflicto

### `GET /v1/attendance/:id`

Uso:

- obtiene una marcación por `id` dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, la marcación debe pertenecer a una sucursal asignada o responde `403`

### `PATCH /v1/attendance/:id`

Uso:

- actualiza una marcación por `id` dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- deja traza en `audit_log_tenant`
- si actúa `BRANCH_ADMIN`, el registro actual y el `branchId` destino deben pertenecer a su scope
- si cambia `eventType` o `eventAt`, vuelve a validar la secuencia permitida contra el evento anterior y el siguiente

### `GET /v1/shifts`

Uso:

- listado paginado de turnos del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, la respuesta se restringe a sus sucursales asignadas

Query params:

- `page` default `1`
- `limit` default `20`, max `100`
- `branchId` opcional
- `employeeId` opcional
- `status` opcional: `SCHEDULED | PUBLISHED | CANCELLED | COMPLETED`
- `from` opcional
- `to` opcional

Reglas de negocio ya activas:

- no se permiten traslapes con otros turnos no cancelados del mismo colaborador
- las transiciones válidas hoy son:
  - `SCHEDULED -> PUBLISHED | CANCELLED`
  - `PUBLISHED -> COMPLETED | CANCELLED`
  - `COMPLETED` y `CANCELLED` quedan terminales

### `POST /v1/shifts`

Uso:

- crea un turno dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- deja traza en `audit_log_tenant`
- si actúa `BRANCH_ADMIN`, `branchId` debe pertenecer a su scope

Payload actual:

```json
{
  "branchId": "uuid-branch",
  "employeeId": "uuid-opcional",
  "startsAt": "2026-06-16T12:00:00.000Z",
  "endsAt": "2026-06-16T20:00:00.000Z",
  "status": "SCHEDULED",
  "notes": "Turno apertura"
}
```

Restricciones activas del contrato:

- `POST /v1/shifts` sólo acepta estado inicial `SCHEDULED | PUBLISHED`
- `PUBLISHED` y `COMPLETED` requieren `employeeId`

### `GET /v1/shifts/:id`

Uso:

- obtiene un turno por `id` dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, el turno debe pertenecer a una sucursal asignada o responde `403`

### `PATCH /v1/shifts/:id`

Uso:

- actualiza un turno por `id` dentro del tenant actual
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- deja traza en `audit_log_tenant`
- si actúa `BRANCH_ADMIN`, el turno actual y el `branchId` destino deben pertenecer a su scope
- valida traslapes
- no permite transiciones de estado; `status` ya no forma parte del contrato de `PATCH`
- un turno `COMPLETED` o `CANCELLED` no puede volver a cambiar sucursal, colaborador ni rango horario

### `POST /v1/shifts/:id/publish`

Uso:

- publica un turno ya creado
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, el turno debe pertenecer a una sucursal asignada
- transición válida: `SCHEDULED -> PUBLISHED`
- requiere `employeeId` asignado

### `POST /v1/shifts/:id/cancel`

Uso:

- cancela un turno ya creado
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, el turno debe pertenecer a una sucursal asignada
- transiciones válidas: `SCHEDULED -> CANCELLED` o `PUBLISHED -> CANCELLED`

### `POST /v1/shifts/:id/complete`

Uso:

- marca como completado un turno publicado
- requiere `Authorization`
- requiere `X-Tenant-ID`
- requiere rol `SUPERADMIN | OWNER | BRANCH_ADMIN`
- si actúa `BRANCH_ADMIN`, el turno debe pertenecer a una sucursal asignada
- transición válida: `PUBLISHED -> COMPLETED`
- requiere `employeeId` asignado

## Notas de autorización vigentes

- para endpoints tenant-scoped, `OWNER` y `BRANCH_ADMIN` se resuelven desde `company_memberships`
- si no existe membership activa para el tenant actual, la API responde `403`
- `SUPERADMIN` puede seguir operando como rol global

## Trabajo pendiente por Fase

- Fase 1: cerrada en esta repo para `SaaS Core + Seguridad` base
- Fase 2: `branches` y `employees` base implementados con permisos finos iniciales y e2e de autorización
- Fase 3: `attendance` y `shifts` base implementados con el mismo patrón de scope por sucursal
- Fase 4: `pos`, `cash-sessions`, `sync`
- Fase 5: `menu`, `inventory`
- Fase 6: `payments`, `commissions`, `dashboards`, `exports`

## Próximos contratos a cerrar

- abrir UI funcional de `attendance` consumiendo el contrato actual sin relajar `Idempotency-Key` ni la secuencia de eventos
- abrir UI funcional de `shifts` usando sólo comandos explícitos de transición y sin cambios directos de `status`
