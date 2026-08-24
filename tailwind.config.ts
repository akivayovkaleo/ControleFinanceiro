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
        'surface-3': 'hsl(var(--surface-3) / <alpha-value>)',
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          strong: 'hsl(var(--brand-strong) / <alpha-value>)',
          fg: 'hsl(var(--brand-fg) / <alpha-value>)',
          soft: 'hsl(var(--brand-soft) / <alpha-value>)',
          border: 'hsl(var(--brand-border) / <alpha-value>)',
        },
        /* Paleta categórica validada — ver o comentário em globals.css. */
        cat: {
          1: 'hsl(var(--cat-1) / <alpha-value>)',
          2: 'hsl(var(--cat-2) / <alpha-value>)',
          3: 'hsl(var(--cat-3) / <alpha-value>)',
          4: 'hsl(var(--cat-4) / <alpha-value>)',
          5: 'hsl(var(--cat-5) / <alpha-value>)',
          6: 'hsl(var(--cat-6) / <alpha-value>)',
          7: 'hsl(var(--cat-7) / <alpha-value>)',
          8: 'hsl(var(--cat-8) / <alpha-value>)',
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
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      height: {
        13: '3.25rem',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        // Números-herói: tamanhos grandes precisam de tracking negativo, senão
        // parecem espaçados demais.
        'money-sm': ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '-0.015em' }],
        'money': ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.025em' }],
        'money-lg': ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.03em' }],
        'money-xl': ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.035em' }],
        'display': ['clamp(2.125rem, 4.2vw, 3.25rem)', { lineHeight: '1.08', letterSpacing: '-0.035em' }],
      },
      /**
       * Sombras em camadas.
       *
       * Uma sombra só, grande e difusa, parece borrão. Duas — uma curta e
       * quase opaca para o contato com a superfície, outra longa e suave para
       * a projeção — é como a luz real se comporta.
       */
      boxShadow: {
        card: '0 1px 2px -1px hsl(var(--shadow-color) / 0.08), 0 1px 3px 0 hsl(var(--shadow-color) / 0.05)',
        lift: '0 2px 4px -2px hsl(var(--shadow-color) / 0.10), 0 8px 20px -6px hsl(var(--shadow-color) / 0.12)',
        pop: '0 4px 8px -4px hsl(var(--shadow-color) / 0.12), 0 16px 40px -12px hsl(var(--shadow-color) / 0.22)',
        brand: '0 1px 2px 0 hsl(var(--brand) / 0.30), 0 6px 16px -6px hsl(var(--brand) / 0.45)',
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
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 160ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionTimingFunction: {
        // Curva de saída rápida: o movimento arranca e desacelera, que é o
        // que faz uma interface parecer responsiva em vez de lenta.
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
