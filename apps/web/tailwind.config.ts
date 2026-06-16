import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        brand: 'var(--brand)',
        'brand-dark': 'var(--brand-dark)',
        surface: 'var(--surface)',
        panel: 'var(--panel)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        sand: 'var(--sand)',
        danger: 'var(--danger)',
      },
      boxShadow: {
        card: '0 20px 60px rgba(53, 40, 20, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
