# ADR-008: Estrategia de backups, restore y exportación por tenant

- Estado: Borrador
- Fecha: 2026-06-14

## Contexto

El baseline exige backups automáticos diarios, restore probado y capacidad de exportación por empresa para una arquitectura `schema por tenant`.

## Decisión propuesta

Diseñar la estrategia operativa con dos niveles:

- respaldo global de la instancia
- exportación y restore lógico por schema de tenant

## Motivo

- Alinea operación SaaS con aislamiento por empresa.
- Reduce blast radius en incidentes de datos.
- Soporta necesidades futuras de soporte, salida de clientes y auditoría.

## Riesgos

- restore parcial más complejo que un backup global
- necesidad de probar consistentemente la restauración por tenant

## Pendientes

- tooling exacto
- frecuencia y retención
- procedimiento de restore validado en staging
