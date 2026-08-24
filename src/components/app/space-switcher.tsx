'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, User, Users } from 'lucide-react';
import Link from 'next/link';
import { switchSpaceAction } from '@/server/actions/spaces';
import { cn } from '@/lib/utils';

export interface SpaceOption {
  spaceId: string;
  name: string;
  type: 'PERSONAL' | 'SHARED';
  memberCount: number;
}

/**
 * Seletor de espaço.
 *
 * É o controle mais importante da interface: ele responde "de quem é o
 * dinheiro que estou vendo agora?". Por isso fica no topo, sempre visível,
 * com o tipo do espaço (pessoal / compartilhado) explícito — confundir os
 * dois seria o pior erro possível neste app.
 */
export function SpaceSwitcher({
  spaces,
  activeSpaceId,
}: {
  spaces: SpaceOption[];
  activeSpaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = spaces.find((s) => s.spaceId === activeSpaceId) ?? spaces[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!active) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
      >
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            active.type === 'SHARED' ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-muted',
          )}
        >
          {active.type === 'SHARED' ? (
            <Users className="h-4 w-4" aria-hidden />
          ) : (
            <User className="h-4 w-4" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{active.name}</span>
          <span className="block text-2xs text-muted">
            {active.type === 'SHARED'
              ? `${active.memberCount} ${active.memberCount === 1 ? 'pessoa' : 'pessoas'}`
              : 'Só você'}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full z-50 mt-2 animate-slide-up overflow-hidden rounded-xl border border-border bg-surface shadow-pop"
        >
          <p className="px-3 pb-1 pt-2.5 text-2xs font-semibold uppercase tracking-wide text-subtle">
            Seus espaços
          </p>

          {spaces.map((space) => (
            <form key={space.spaceId} action={switchSpaceAction}>
              <input type="hidden" name="spaceId" value={space.spaceId} />
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    space.type === 'SHARED'
                      ? 'bg-brand-soft text-brand'
                      : 'bg-surface-2 text-muted',
                  )}
                >
                  {space.type === 'SHARED' ? (
                    <Users className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <User className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{space.name}</span>
                {space.spaceId === activeSpaceId && (
                  <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                )}
              </button>
            </form>
          ))}

          <div className="border-t border-border">
            <Link
              href="/configuracoes/espacos"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-surface-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Criar ou entrar num espaço
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
