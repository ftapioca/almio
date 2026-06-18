# Deploy Readiness Checklist

Cierre formal del bloque `deploy readiness web/API` sobre el estado real del repositorio al `2026-06-18`.

## Done

- `apps/api` desplegada en Vercel y validada por `GET /v1/health/live`
- `apps/api` validada por `GET /v1/health/ready` con `database.status=up`
- runtime config mínima cerrada:
  - `API_PORT`
  - `API_CORS_ALLOWED_ORIGINS`
  - `NEXT_PUBLIC_API_URL`
- `public` y `tenant` migraciones alineadas mediante `pnpm prisma:migrate:release`
- observabilidad mínima activa en API:
  - `x-request-id`
  - logs estructurados de request/response
  - logs estructurados de excepciones
- runbooks mínimos documentados:
  - deploy
  - rollback
  - smoke checks
  - setup específico de Vercel
- `apps/web` desplegada en Vercel con `Next.js 15.5.9`
- login web real validado con `Supabase Auth`
- backoffice `/backoffice/branch-scopes` cargando en producción
- flujo real validado para consultar scopes de una membership `BRANCH_ADMIN` usando un usuario `OWNER`

## Pending

- observabilidad externa:
  - `Sentry`
  - métricas agregadas
  - dashboards básicos
- runbooks operativos avanzados:
  - backups y restore por tenant
  - incident response
  - rotación de secretos
- cierre del bug o decisión operativa para credenciales históricas de `branch-admin@almio.cl`
- definición por proveedor de cómo se ejecutará `pnpm prisma:migrate:release` en pipeline o release manual
- smoke checks automatizados desde CI o post-deploy hook

## Next

1. abrir UI funcional de `attendance` sobre el contrato backend ya fijado
2. continuar con UI funcional de `shifts`
3. después consolidar shell/backoffice general
4. volver al bloque de plataforma sólo cuando entren observabilidad externa, backups o pipeline de release más estricto

## Definition of Done

Este bloque se considera cerrado para el estado actual del proyecto porque:

- web y API despliegan en Vercel
- auth real funciona en web
- API responde `live` y `ready`
- migraciones quedaron documentadas y ejecutadas
- existe operación mínima reproducible para deploy y rollback
