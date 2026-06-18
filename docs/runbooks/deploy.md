# Deploy

Runbook mínimo de despliegue para `apps/api` y `apps/web`.

## Alcance actual

Este runbook cubre el estado real implementado hoy:

- `apps/api` con runtime config, CORS y probes `health/live/ready`
- `apps/web` con auth real por `Supabase Auth`
- migraciones `public` + `tenant` secuenciadas por `pnpm prisma:migrate:release`

No fija todavía un proveedor único de infraestructura. Aplica a cualquier entorno donde:

- `apps/api` y `apps/web` se desplieguen por separado
- exista acceso a `DATABASE_URL`, `DIRECT_URL` y variables Supabase
- se pueda ejecutar el release command del monorepo

## Preconditions

Antes de desplegar:

1. Confirmar que `main` o el commit objetivo pasa `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`.
2. Confirmar variables de entorno de producción:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` si se usarán scripts operativos
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_API_URL`
   - `API_PORT`
   - `API_CORS_ALLOWED_ORIGINS`
3. Confirmar respaldo o snapshot disponible de la base antes de migraciones, al menos mientras no exista runbook formal de backup/restore.
4. Confirmar ventana de despliegue y responsable de rollback.

## Deploy Sequence

Orden aprobado para release:

1. Desplegar nueva versión de `apps/api`.
2. Ejecutar migraciones de release:

```bash
pnpm prisma:migrate:release
```

3. Verificar readiness de API:

```bash
curl -i "$API_BASE_URL/v1/health/ready"
```

4. Desplegar `apps/web` con `NEXT_PUBLIC_API_URL` apuntando a la API ya actualizada.
5. Ejecutar smoke checks de post deploy.

Opción recomendada:

- correr el workflow manual `Backoffice Smoke` en GitHub Actions contra las URLs desplegadas

## Notes

- `pnpm prisma:migrate:release` corre primero `public`, luego `tenant`.
- Si se necesita acotar tenant migrations a un subconjunto controlado:

```bash
TENANT_MIGRATION_COMPANY_SLUGS=almio,beta pnpm prisma:migrate:release
```

- No continuar al despliegue web si la API no responde `ready`.

## Exit Criteria

El deploy se considera exitoso cuando:

1. `GET /v1/health/live` responde `200`.
2. `GET /v1/health/ready` responde `200`.
3. La web permite login en `/auth/login`.
4. El backoffice `/backoffice/branch-scopes` carga con sesión válida.
5. Al menos una llamada autenticada a API responde `200`.
