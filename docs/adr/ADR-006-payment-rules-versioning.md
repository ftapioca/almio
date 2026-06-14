# ADR-006: Versionamiento de reglas de pago y cálculo

- Estado: Borrador
- Fecha: 2026-06-14

## Contexto

El SDD y el SRS requieren que los cálculos de pagos y comisiones sean reproducibles históricamente y trazables por regla aplicada.

## Decisión propuesta

Versionar reglas de pago y comisiones como entidades explícitas, referenciadas por cada cálculo generado.

## Motivo

- Permite reconstruir cálculos históricos.
- Evita recalcular con reglas nuevas sobre períodos antiguos.
- Soporta auditoría y disputas operativas.

## Riesgos

- Complejidad de diseño en vigencias y overrides por local o colaborador.
- Necesidad de congelar insumos al momento del cálculo.

## Pendientes

- granularidad del versionado
- política de re-cálculo
- relación entre horas aprobadas, ventas y reglas mixtas
