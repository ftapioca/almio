# ADR-002: Estrategia PWA Offline para POS y Asistencia

- Estado: Borrador
- Fecha: 2026-06-14

## Contexto

POS y asistencia deben operar offline-first y sincronizar sin duplicados ni pérdida de integridad.

## Decisión propuesta

Usar PWA con:

- Service Worker
- IndexedDB para cola local
- Eventos inmutables versionados
- Sincronización batch por `POST /v1/sync/events`
- Idempotencia por UUID

## Motivo

- Alineado con SDD/SRS.
- Compatible con operación intermitente en locales pequeños.

## Riesgos

- Complejidad de sincronización y resolución de conflictos.
- Necesidad de diseño cuidadoso del modelo de eventos y hash chain.

## Pendientes

- Política exacta de caché.
- Estrategia de resolución de conflictos.
- Registro y revocación de dispositivos.

