# @almio/design-system

Design System oficial de **Almio** (RRHH · Asistencia · Turnos · POS · Caja · Inventario).
Estética del spec v1.0: **Inter + azul `#2563EB` + shadcn/ui**, light theme, WCAG 2.1 AA, base 8px.

Fuente de verdad de UI. **Ningún valor visual debe hardcodearse en componentes** — siempre tokens del preset / `var(--…)`.

## Dónde va en el monorepo

```
packages/
  design-system/        ← esta carpeta
apps/
  web/                  ← la consume
```

El `pnpm-workspace.yaml` ya declara `packages/*`, así que solo copia esta carpeta como `packages/design-system/` y corre `pnpm install` en la raíz.

## Estructura

```
design-system/
  package.json
  tsconfig.json
  tailwind-preset.ts             preset Tailwind (colores, spacing 8px, radius, elevation, z-index, motion)
  tokens/
    almio.tokens.json            tokens oficiales (el JSON del spec, extendido con neutrales)
  src/
    index.ts                     barrel: import { Button, ... } from '@almio/design-system'
    styles/globals.css           CSS variables (light) — semantic shadcn + crudas Almio
    lib/utils.ts                 cn()
    components/ui/               Button, Input, Label, Textarea, Select, Checkbox, RadioGroup,
                                 Switch, Badge, Avatar, Tooltip, Skeleton, Card, Alert, Dialog,
                                 Tabs, Separator
```

## Foundations (resumen)

| Token | Valor |
|---|---|
| Primary 500 | `#2563EB` (escala 50–900) |
| Navy / Sidebar | `#0F172A` |
| Semánticos | success `#16A34A` · warning `#F59E0B` · danger `#DC2626` · info `#0EA5E9` |
| POS offline | connected `#22C55E` · syncing `#EAB308` · offline `#EF4444` |
| Tipografía | Inter — h1 48/700 … caption 12/400; `tabular-nums` para cifras |
| Spacing | base 8px (tokens 1–10) |
| Radius | sm 4 · md 8 · lg 12 · xl 16 · 2xl 24 |
| Elevation | L1 cards · L2 dropdown · L3 modal |
| Motion | fast 150 · normal 250 · slow 350 ms |

## Uso de utilidades Tailwind del preset

- Color semántico: `bg-primary`, `text-primary-foreground`, `border-border`, `text-muted-foreground`, `bg-destructive`
- Escala completa: `bg-primary-500`, `text-success-700`, `bg-navy-900`, `text-pos-offline`
- Sidebar: `bg-sidebar text-sidebar-foreground`
- Tipografía: `text-h1`, `text-body-sm`, `text-caption`
- Elevation: `shadow-elevation-1|2|3`
- Radius: `rounded-md` (8px), `rounded-2xl` (24px)
- Motion: `duration-fast|normal|slow`
- Z-index: `z-modal`, `z-toast`, `z-sidebar`

## Roadmap (no incluido en v1)

Form (FormField/FormMessage + RHF/Zod, DatePicker, CurrencyInput…), Navigation (Sidebar/Topbar/Breadcrumb/Drawer…), Feedback (Toast/Sheet/EmptyState/OfflineState…), Data Display (DataTable, MetricCard, KPICard, charts), y componentes de negocio (RRHH, Attendance, POS, Inventory, Dashboard) + Layouts (AppShell…).
Este v1 entrega Foundations + los Foundation Components base sobre los que se construye todo lo demás.

Ver `INTEGRATION.md` para conectar `apps/web`.
