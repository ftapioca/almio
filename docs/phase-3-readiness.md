# Fase 3 Readiness

Cierre documental de `attendance` y `shifts`, derivado de `SoW`, `SDD`, `SRS`, `DocAPI` y `Cronograma`.

## Precondiciones ya resueltas

- `branches` y `employees` ya operan con aislamiento tenant y scopes por sucursal.
- `Supabase Auth` ya es el login real de la plataforma y la API valida JWT server-side.
- `BRANCH_ADMIN` ya quedó restringido por `company_memberships` activas y `branch_membership_scopes`.
- existe auditoría tenant para escrituras operativas.
- CI local y del monorepo ya validan `lint`, `typecheck`, `test` y `build`.

## Cambios cerrados en este tramo

### Contratos backend estabilizados

- `attendance` exige `Idempotency-Key` en `POST /v1/attendance`.
- `attendance` ya valida secuencia operativa real:
  - `CHECK_IN`
  - `BREAK_START`
  - `BREAK_END`
  - `CHECK_OUT`
- `attendance` ya rechaza secuencias inválidas mirando eventos previos y posteriores.
- `shifts` ya no permite cambiar `status` por `PATCH /v1/shifts/:id`.
- `shifts` expone comandos explícitos para transición de estado:
  - `POST /v1/shifts/:id/publish`
  - `POST /v1/shifts/:id/cancel`
  - `POST /v1/shifts/:id/complete`
- `shifts` mantiene validación de traslapes por colaborador.

### Administración operativa de scopes

- la gestión de `branch_membership_scopes` ya no depende sólo de scripts
- existe contrato admin:
  - `GET /v1/admin/branch-membership-scopes`
  - `PUT /v1/admin/branch-membership-scopes/:membershipId`
- existe backoffice mínimo en `/backoffice/branch-scopes` para consultar y reemplazar scopes

### Migraciones tenant e idempotencia

- se agregó la migración tenant `20260616_000003_attendance_idempotency.sql`
- la migración ya fue aplicada sobre los tenants existentes del entorno actual
- el replay de idempotencia devuelve el mismo registro cuando coinciden key y payload

### Auth web real para backoffice

- existe login web real en `/auth/login`
- la sesión vive en `Supabase Auth`
- el backoffice se protege server-side y redirige si no existe sesión
- la web obtiene el `Bearer token` desde la sesión Supabase para consumir la API Almio

## Validación ya ejecutada

- e2e HTTP de autorización para `attendance` y `shifts`, incluyendo negativos de escritura fuera de sucursales asignadas para `BRANCH_ADMIN`
- pruebas de contratos de `attendance` para idempotencia y secuencias inválidas
- pruebas de contratos de `shifts` para comandos explícitos y transiciones inválidas
- validación real de login con `branch-admin@almio.cl` consumiendo la API con JWT emitido por Supabase
- validación local de workspace con `lint`, `typecheck`, `test` y `build`
- validación funcional real en producción sobre Vercel:
  - `apps/api` recuperada y validada con `health/live` y `health/ready`
  - `apps/web` validada con login real vía `Supabase Auth`
  - `attendance` cargando correctamente en producción
  - rechazo esperado de secuencia inválida al repetir `CHECK_IN`
  - `shifts` validado con creación de turno y transición `publish`

## Commits de referencia

- `223969f` `Harden phase 3 contracts and scope admin flow`
- `b174379` `Explicit shift commands and attendance idempotency`
- `3db12d1` `Add Supabase web auth for backoffice`
- `b4aeb25` `refactor backoffice web consoles`
- `e1cc8aa` `fix attendance loading loop`
- `d942b17` `fix api vercel handler export`
- `16ff3a0` `fix api commonjs handler export`
- `053b0a3` `fix api express runtime dependency`

## Decisión de corte

- no abrir todavía UI funcional de asistencia o turnos por encima de contratos inestables
- desde este punto sí conviene arrancar UI funcional, porque:
  - los contratos backend quedaron fijados
  - la migración tenant crítica ya fue aplicada
  - el login web real ya existe
  - el patrón de autorización por sucursal ya está probado

## Siguiente tramo recomendado

1. construir UI funcional de `attendance` sobre el contrato actual sin volver a mover eventos ni headers
2. continuar con UI funcional de `shifts` reutilizando el mismo patrón de auth y scopes
3. recién después ampliar shell/backoffice general, evitando adelantar capas de POS o dashboards
