# Vercel Setup

Setup concreto de `Almio` en Vercel usando dos proyectos separados dentro del mismo monorepo.

## Base Decision

Proveedor objetivo actual:

- `apps/web` en Vercel
- `apps/api` en Vercel

Esta decisión aplica al estado actual del repo:

- `web` en `Next.js 15`
- `api` en `NestJS` sin jobs persistentes, sin websockets y sin workers separados

## Project Split

Crear dos proyectos en Vercel conectados al mismo repositorio Git:

1. `almio-web`
2. `almio-api`

Para cada uno, al importar el repo:

1. seleccionar `Add New Project`
2. elegir el mismo repositorio
3. configurar `Root Directory`

Valores:

- `almio-web` -> `apps/web`
- `almio-api` -> `apps/api`

## Required Vercel Settings

En ambos proyectos:

1. usar `Node.js 22.x`
2. habilitar `Include source files outside of the Root Directory`
3. mantener deploys por Git en `main`

Nota:

- el punto 2 es importante porque el monorepo comparte configuración raíz y workspace fuera del root de cada app

## Web Project

Proyecto:

- nombre sugerido: `almio-web`
- root directory: `apps/web`
- framework preset: `Next.js`

Variables de entorno mínimas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL`

Valor esperado de `NEXT_PUBLIC_API_URL`:

- URL pública del proyecto `almio-api`, por ejemplo `https://almio-api.vercel.app/v1`

Validaciones post setup:

- build de `Next.js` detectado correctamente
- login disponible en `/auth/login`
- backoffice protegido en `/backoffice/branch-scopes`

## API Project

Proyecto:

- nombre sugerido: `almio-api`
- root directory: `apps/api`
- framework preset: `NestJS` o autodetección equivalente

Archivo versionado:

- [apps/api/vercel.json](/Users/ftapioca/Projects/Almio/almio/apps/api/vercel.json)

Configuración aplicada:

- `fluid: true`
- `maxDuration: 30` para la function derivada de `src/main.ts`

Variables de entorno mínimas:

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_PORT`
- `API_CORS_ALLOWED_ORIGINS`
- `TENANT_HEADER_NAME`
- `SENTRY_DSN` cuando se conecte observabilidad externa

Valor esperado de `API_CORS_ALLOWED_ORIGINS`:

- dominio de `almio-web`, por ejemplo `https://almio-web.vercel.app`

## Deploy Order

Orden recomendado de despliegue en producción:

1. desplegar `almio-api`
2. ejecutar `pnpm prisma:migrate:release`
3. validar `GET /v1/health/ready`
4. desplegar `almio-web`
5. correr smoke checks

Opción repetible recomendada:

- lanzar el workflow `Backoffice Smoke` desde GitHub Actions usando las URLs públicas de `almio-api` y `almio-web`

## CLI Notes

Si se usa Vercel CLI, hacerlo desde la carpeta correcta del proyecto:

```bash
cd apps/web
vercel
```

```bash
cd apps/api
vercel
```

La CLI vincula cada carpeta con su proyecto Vercel respectivo dentro de `.vercel/`.

## Current Limits and Warnings

- `apps/api` corre como una Vercel Function única de NestJS
- esta estrategia es adecuada hoy, pero puede dejar de ser buen fit cuando entren `Redis`, `BullMQ`, jobs prolongados o procesos persistentes
- si el backend gana esos componentes, reevaluar `api` fuera de Vercel sin mover necesariamente `web`
