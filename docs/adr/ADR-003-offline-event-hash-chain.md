# ADR-003: Firma y hash encadenado para eventos offline

- Estado: Borrador
- Fecha: 2026-06-14

## Contexto

El SDD y el SRS exigen que los eventos offline de POS y asistencia sean inmutables, idempotentes y verificables contra manipulación antes de sincronizar.

## Decisión propuesta

Usar eventos offline con:

- `uuid` como idempotency key
- `localTimestamp` como orden local
- `prevHash` para cadena por dispositivo o sesión de caja
- `hash` SHA-256 calculado sobre metadatos y payload

## Motivo

- Detecta tampering antes de persistir en backend.
- Alinea la PWA con el threat model STRIDE del SRS.
- Reduce riesgo de duplicados y alteraciones en operación offline.

## Riesgos

- Mayor complejidad en sincronización y troubleshooting.
- Necesidad de definir claramente el scope de la cadena: dispositivo, caja o sesión.

## Pendientes

- formato exacto del payload hasheado
- estrategia de rotación o reinicio de cadena
- tratamiento de conflictos y eventos rechazados
