# ADR-007: Estrategia de agregación para dashboards y KPIs

- Estado: Borrador
- Fecha: 2026-06-14

## Contexto

El MVP debe exponer dashboards de RRHH y ventas con exportación PDF/XLSX y tiempos de respuesta razonables.

## Decisión propuesta

Evaluar una estrategia híbrida entre:

- consultas directas para vistas simples
- agregados persistidos o materializados para KPIs pesados
- jobs diferidos para exports

## Motivo

- Balancea simplicidad en fases tempranas con rendimiento en producción.
- Permite priorizar KPIs críticos del MVP sin sobre-ingeniería inicial.

## Riesgos

- datos stale si se materializa con baja frecuencia
- mayor complejidad de reconciliación entre fuente transaccional y agregados

## Pendientes

- criterio para materializar
- frecuencia de refresh
- ownership entre API transaccional y workers
