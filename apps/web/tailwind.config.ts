import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        verified: {
          DEFAULT: 'hsl(var(--verified) / <alpha-value>)',
          fg: 'hsl(var(--verified-fg) / <alpha-value>)',
          bg: 'hsl(var(--verified-bg) / <alpha-value>)',
          border: 'hsl(var(--verified-border) / <alpha-value>)',
        },
        tampered: {
          DEFAULT: 'hsl(var(--tampered) / <alpha-value>)',
          fg: 'hsl(var(--tampered-fg) / <alpha-value>)',
          bg: 'hsl(var(--tampered-bg) / <alpha-value>)',
          border: 'hsl(var(--tampered-border) / <alpha-value>)',
        },
        revoked: {
          DEFAULT: 'hsl(var(--revoked) / <alpha-value>)',
          fg: 'hsl(var(--revoked-fg) / <alpha-value>)',
          bg: 'hsl(var(--revoked-bg) / <alpha-value>)',
          border: 'hsl(var(--revoked-border) / <alpha-value>)',
        },
        notreg: {
          DEFAULT: 'hsl(var(--notreg) / <alpha-value>)',
          fg: 'hsl(var(--notreg-fg) / <alpha-value>)',
          bg: 'hsl(var(--notreg-bg) / <alpha-value>)',
          border: 'hsl(var(--notreg-border) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
