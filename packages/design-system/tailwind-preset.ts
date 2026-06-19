import type { Config } from 'tailwindcss';

/**
 * Almio Design System — Tailwind preset
 *
 * Uso en apps/web/tailwind.config.ts:
 *   import almioPreset from '@almio/design-system/tailwind-preset';
 *   export default { presets: [almioPreset], content: [...] };
 *
 * Expone:
 *  - colores semanticos shadcn (bg-primary, text-muted-foreground, border-border, ...)
 *  - escalas completas Almio (bg-primary-500, text-success-700, bg-navy-900, ...)
 *  - estados POS offline (text-pos-offline, ...)
 *  - radius / shadow(elevation) / spacing(8px) / fontSize / zIndex / motion
 */
const preset: Omit<Config, 'content'> = {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // Escala primaria completa + alias semantico (DEFAULT = 500)
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
        },
        navy: { 900: '#0F172A' },
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#16A34A',
          700: '#15803D',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          700: '#B45309',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#DC2626',
          700: '#B91C1C',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          50: '#F0F9FF',
          100: '#E0F2FE',
          500: '#0EA5E9',
          700: '#0369A1',
        },
        pos: {
          connected: 'hsl(var(--almio-pos-connected))',
          syncing: 'hsl(var(--almio-pos-syncing))',
          offline: 'hsl(var(--almio-pos-offline))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--almio-sidebar))',
          foreground: 'hsl(var(--almio-sidebar-foreground))',
          muted: 'hsl(var(--almio-sidebar-muted))',
          active: 'hsl(var(--almio-sidebar-active))',
          border: 'hsl(var(--almio-sidebar-border))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        h1: ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        h2: ['36px', { lineHeight: '1.15', fontWeight: '700' }],
        h3: ['30px', { lineHeight: '1.2', fontWeight: '600' }],
        h4: ['24px', { lineHeight: '1.25', fontWeight: '600' }],
        h5: ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.5' }],
        body: ['16px', { lineHeight: '1.5' }],
        'body-sm': ['14px', { lineHeight: '1.5' }],
        caption: ['12px', { lineHeight: '1.4' }],
      },
      // Grid 8px (token n = n * 8px); se suma a la escala default de Tailwind
      spacing: {
        1: '8px',
        2: '16px',
        3: '24px',
        4: '32px',
        5: '40px',
        6: '48px',
        8: '64px',
        10: '80px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'elevation-0': 'none',
        'elevation-1': '0 1px 3px rgba(0,0,0,0.08)',
        'elevation-2': '0 4px 12px rgba(0,0,0,0.12)',
        'elevation-3': '0 12px 32px rgba(0,0,0,0.18)',
      },
      maxWidth: {
        'container-narrow': '768px',
        'container-standard': '1280px',
        'container-wide': '1440px',
      },
      screens: {
        tablet: '768px',
        desktop: '1024px',
        wide: '1440px',
      },
      zIndex: {
        base: '0',
        dropdown: '100',
        sticky: '200',
        sidebar: '300',
        modal: '400',
        toast: '500',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '250ms',
        slow: '350ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default preset;
