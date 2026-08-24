'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

/**
 * Alternador de tema.
 *
 * A escolha vive no localStorage (não no banco) porque é uma preferência do
 * DISPOSITIVO: a mesma pessoa pode querer escuro no celular à noite e claro
 * no notebook. O script no <head> do layout raiz lê essa chave antes da
 * primeira pintura para não haver flash.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('cf-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') setTheme(stored);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    const root = document.documentElement;

    if (next === 'system') {
      localStorage.removeItem('cf-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      return;
    }

    localStorage.setItem('cf-theme', next);
    root.classList.toggle('dark', next === 'dark');
  }

  // Antes de montar não sabemos o tema: renderizar o estado errado causaria
  // um "pulo" visual, então reservamos o espaço.
  if (!mounted) return <div className={compact ? 'h-9 w-9' : 'h-9 w-[7.5rem]'} />;

  const OPTIONS: Array<{ value: Theme; icon: typeof Sun; label: string }> = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'dark', icon: Moon, label: 'Escuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
  ];

  if (compact) {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const Icon = theme === 'dark' ? Sun : Moon;
    return (
      <button
        type="button"
        onClick={() => apply(next)}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        aria-label={`Mudar para tema ${next === 'dark' ? 'escuro' : 'claro'}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex items-center gap-0.5 rounded-xl bg-surface-2 p-0.5"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => apply(value)}
          title={label}
          className={cn(
            'flex h-8 w-9 items-center justify-center rounded-lg transition-colors',
            theme === value
              ? 'bg-surface text-fg shadow-sm'
              : 'text-muted hover:text-fg',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
