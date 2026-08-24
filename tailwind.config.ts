import type { Config } from 'tailwindcss';

/**
 * Design tokens do Controle Financeiro.
 *
 * Todas as cores vêm de variáveis CSS definidas em src/app/globals.css,
 * o que permite trocar o tema (claro/escuro) sem recompilar classes.
 * Nunca use cores literais (`text-[#123456]`) em componentes — adicione
 * um token aqui. Ver docs/DESIGN.md.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        'surface-2': 'hsl(var(--surface-2) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        'border-strong': 'hsl(var(--border-strong) / <alpha-value>)',
        fg: 'hsl(var(--fg) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        subtle: 'hsl(var(--subtle) / <alpha-value>)',
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          fg: 'hsl(var(--brand-fg) / <alpha-value>)',
          soft: 'hsl(var(--brand-soft) / <alpha-value>)',
        },
        income: {
          DEFAULT: 'hsl(var(--income) / <alpha-value>)',
          soft: 'hsl(var(--income-soft) / <alpha-value>)',
        },
        expense: {
          DEFAULT: 'hsl(var(--expense) / <alpha-value>)',
          soft: 'hsl(var(--expense-soft) / <alpha-value>)',
        },
        transfer: {
          DEFAULT: 'hsl(var(--transfer) / <alpha-value>)',
          soft: 'hsl(var(--transfer-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          soft: 'hsl(var(--warning-soft) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          soft: 'hsl(var(--danger-soft) / <alpha-value>)',
        },
      },
      borderColor: {
        DEFAULT: 'hsl(var(--border))',
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 2px 0 hsl(var(--shadow) / 0.05), 0 1px 3px 0 hsl(var(--shadow) / 0.06)',
        pop: '0 10px 30px -10px hsl(var(--shadow) / 0.25)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
