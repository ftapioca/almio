# Integración con `apps/web`

Pasos para que el portal Next.js 15 consuma `@almio/design-system`. Reemplaza la piel cálida/serif actual por la estética del spec (Inter + azul + shadcn).

## 1. Copiar el paquete

Copia esta carpeta a `packages/design-system/` en la raíz del monorepo.

## 2. Declarar la dependencia en `apps/web/package.json`

```jsonc
{
  "dependencies": {
    "@almio/design-system": "workspace:*",
    // … existentes
  }
}
```

Las dependencias de runtime (Radix, cva, clsx, tailwind-merge, lucide-react) viven en
`packages/design-system/package.json` y se resuelven solas vía workspace. Luego:

```bash
pnpm install
```

## 3. Tailwind: usar el preset

`apps/web/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';
import almioPreset from '@almio/design-system/tailwind-preset';

const config: Config = {
  presets: [almioPreset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    // importante: incluir el paquete para que Tailwind vea sus clases
    '../../packages/design-system/src/**/*.{ts,tsx}',
  ],
};

export default config;
```

> Elimina del `tailwind.config.ts` actual los colores bespoke (`brand`, `sand`, `ink`, `panel`, …); ahora vienen del preset.

## 4. Estilos globales

`apps/web/app/globals.css` — reemplaza el contenido actual por:

```css
@import '@almio/design-system/styles/globals.css';
```

> Esto borra el fondo crema, la textura de papel, los gradientes y la fuente serif.
> Si prefieres migrar gradualmente, mantené tu archivo pero importá las variables del DS arriba.

## 5. Fuente Inter (next/font)

`apps/web/app/layout.tsx`:

```tsx
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

## 6. Usar componentes

```tsx
import { Button, Input, Label, Badge, Card, CardHeader, CardTitle, CardContent } from '@almio/design-system';

export function Demo() {
  return (
    <Card>
      <CardHeader><CardTitle>Nueva marcación</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="branch">Sucursal</Label>
          <Input id="branch" placeholder="Providencia" />
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="success">Presente</Badge>
          <Button>Registrar marcación</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 7. Migrar las consolas existentes (attendance / shifts / branch-scopes / login)

Reemplazos directos del patrón actual:

| Patrón actual (apps/web) | Reemplazo DS |
|---|---|
| `<input className="field-input" />` | `<Input />` |
| `<textarea className="field-input …" />` | `<Textarea />` |
| `<select className="field-input">` | `<Select>` + `SelectTrigger/SelectContent/SelectItem` |
| `<button className="… rounded-full bg-brand …">` | `<Button>` (o `variant="secondary" / "ghost" / "danger"`) |
| `<span className="rounded-full border …">` (chips de estado) | `<Badge variant="…">` |
| `rounded-[30px] … bg-surface shadow-card` (cards) | `<Card>` |
| bloques `border-danger/30 bg-danger/8` (errores) | `<Alert variant="danger">` |
| clase global `.field-input` en globals.css | eliminar (la cubre `<Input>`) |

La lógica (Supabase, fetch, Idempotency-Key, estados) **no cambia** — solo la capa visual.

## 8. Verificación

```bash
pnpm --filter @almio/web typecheck
pnpm --filter @almio/web lint
pnpm --filter @almio/web build
```
