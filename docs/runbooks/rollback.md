# Rollback

Runbook mínimo de rollback para el bloque actual `web + api`.

## Trigger Conditions

Ejecutar rollback cuando ocurra cualquiera de estos casos:

- `GET /v1/health/ready` queda en `503` después del deploy
- fallan smoke checks de login o backoffice
- las tenant migrations fallan y dejan el release incompleto
- aparece regresión funcional severa en endpoints ya estabilizados

## Strategy

Mientras no exista rollback automatizado de base de datos, la estrategia aprobada es conservadora:

1. detener promoción de tráfico al release nuevo
2. restaurar versión previa de `apps/api`
3. restaurar versión previa de `apps/web`
4. evaluar si el problema fue sólo de aplicación o también de esquema

## Application Rollback

1. Revertir `apps/api` al artefacto o release inmediatamente anterior.
2. Verificar:

```bash
curl -i "$API_BASE_URL/v1/health/live"
curl -i "$API_BASE_URL/v1/health/ready"
```

3. Revertir `apps/web` al artefacto o release inmediatamente anterior.
4. Repetir smoke checks básicos.

## Database Rollback

Regla actual:

- no ejecutar rollback manual de esquema sin snapshot o backup validado
- si `public` migró pero `tenant` falló, congelar nuevas migraciones y evaluar alcance exacto antes de seguir

Pasos mínimos:

1. identificar la migración fallida
2. identificar tenants ya migrados y tenants pendientes
3. decidir una de estas dos rutas:
   - completar la migración faltante si el cambio es forward-fix seguro
   - restaurar base desde backup si el cambio rompió compatibilidad

## Incident Notes

Registrar siempre:

- commit desplegado
- hora del inicio de deploy
- salida de `pnpm prisma:migrate:release`
- tenants afectados
- síntomas observados en readiness y smoke checks

## Exit Criteria

El rollback se considera cerrado cuando:

1. API vuelve a responder `live` y `ready`
2. login web vuelve a funcionar
3. smoke checks vuelven a pasar
4. queda registrada la causa y el siguiente paso correctivo
