# Smoke Checks

Checklist mínimo de validación post deploy.

## Smoke Suite Automatizada

Existe un smoke suite automatizado para el frente actual de backoffice:

```bash
BACKOFFICE_SMOKE_API_URL=http://localhost:3001/v1 \
BACKOFFICE_SMOKE_WEB_URL=http://localhost:3000 \
BACKOFFICE_SMOKE_TENANT_ID=almio \
BACKOFFICE_SMOKE_EMAIL=owner-web@almio.cl \
BACKOFFICE_SMOKE_PASSWORD=AlmioOwner2026 \
pnpm prisma:backoffice-smoke-check
```

Opcionalmente puede incluirse un probe admin:

```bash
BACKOFFICE_SMOKE_MEMBERSHIP_ID=<uuid-membership> \
pnpm prisma:backoffice-smoke-check
```

Modo anónimo, sin login real:

```bash
BACKOFFICE_SMOKE_MODE=anonymous \
pnpm prisma:backoffice-smoke-check
```

La suite valida:

- `/auth/login` renderiza correctamente
- `/backoffice`, `/backoffice/attendance`, `/backoffice/shifts` y `/backoffice/branch-scopes` redirigen a login sin sesión
- `health/live` y `health/ready`
- login real contra `Supabase Auth`
- probes autenticados a `me`, `branches`, `employees`, `attendance` y `shifts`
- probes funcionales read-only sobre `attendance`:
  - `GET /attendance/:id`
  - listado filtrado por sucursal, colaborador y día
- probes funcionales read-only sobre `shifts`:
  - `GET /shifts/:id`
  - listado filtrado por sucursal, colaborador/estado y día
- probe opcional a `admin/branch-membership-scopes`

## GitHub Actions

Quedó disponible un workflow manual:

- `.github/workflows/backoffice-smoke.yml`

Uso recomendado post deploy:

1. ir a `Actions`
2. abrir `Backoffice Smoke`
3. ejecutar `Run workflow`
4. elegir:
   - `mode=anonymous` para validar sólo web sin sesión + health API
   - `mode=full` para validar también login real y probes autenticados

Secrets requeridos para `mode=full`:

- `BACKOFFICE_SMOKE_EMAIL`
- `BACKOFFICE_SMOKE_PASSWORD`
- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Inputs relevantes:

- `api_base_url`
- `web_base_url`
- `tenant_id`
- `membership_id` opcional para probe admin

## Nota Local

Si la suite falla sólo en web local con `500` y mensajes tipo `Cannot find module './3.js'`
desde `.next/server`, el problema suele ser un `next dev` viejo o corrupto.

Acción recomendada:

1. detener el server web local actual
2. levantarlo de nuevo con `pnpm dev:web`
3. repetir la suite

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
