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

## Trabajo pendiente por Fase

- Fase 1: `auth`, `admin`, tenant resolver real, RBAC, auditoría
- Fase 2: `branches`, `employees`
- Fase 3: `attendance`, `shifts`
- Fase 4: `pos`, `cash-sessions`, `sync`
- Fase 5: `menu`, `inventory`
- Fase 6: `payments`, `commissions`, `dashboards`, `exports`
