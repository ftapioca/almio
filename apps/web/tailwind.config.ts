import type { Config } from 'tailwindcss';
import almioPreset from '@almio/design-system/tailwind-preset';

const config: Config = {
  presets: [almioPreset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/design-system/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: 'hsl(var(--primary))',
        'brand-dark': '#1D4ED8',
        surface: 'hsl(var(--card))',
        panel: 'hsl(var(--muted))',
        ink: 'hsl(var(--almio-sidebar))',
        sand: '#DBEAFE',
      },
      boxShadow: {
        card: '0 12px 32px rgba(0,0,0,0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
