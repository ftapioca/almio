import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f7f7f5',
        foreground: '#121212',
        muted: '#6b7280',
        brand: '#0f766e',
        surface: '#ffffff',
        border: '#e5e7eb',
      },
    },
  },
  plugins: [],
};

export default config;

