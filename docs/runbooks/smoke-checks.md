# Smoke Checks

Checklist mínimo de validación post deploy.

## API

Ejecutar:

```bash
curl -i "$API_BASE_URL/v1/health/live"
curl -i "$API_BASE_URL/v1/health/ready"
```

Esperado:

- ambos responden `200`
- `ready` informa `database.status=up`

## Web Auth

Validar manualmente:

1. abrir `/auth/login`
2. iniciar sesión con un usuario real de prueba
3. confirmar redirección exitosa

Esperado:

- no hay error de sesión Supabase
- la cookie de sesión queda activa

## Backoffice

Validar manualmente:

1. abrir `/backoffice/branch-scopes`
2. confirmar que carga la vista protegida
3. verificar que el token de sesión está disponible

Esperado:

- no hay redirect loop
- no hay error de `NEXT_PUBLIC_API_URL`

## Authenticated API Probe

Con un JWT válido y tenant conocido:

```bash
curl -i \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  "$API_BASE_URL/v1/me"
```

Esperado:

- respuesta `200`
- `tenantId` y roles coherentes con el usuario

## Optional Admin Probe

Si el usuario de prueba tiene permisos suficientes:

```bash
curl -i \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  "$API_BASE_URL/v1/admin/branch-membership-scopes?membershipId=$MEMBERSHIP_ID"
```

## Failure Rule

Si falla cualquier check:

1. no declarar el deploy como exitoso
2. capturar evidencia
3. evaluar rollback usando `docs/runbooks/rollback.md`
