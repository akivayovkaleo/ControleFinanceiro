'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { currentMonthKey, formatMonthKey, shiftMonthKey } from '@/lib/date';

/**
 * Seletor de competência.
 *
 * Navega por mês mantendo o resto da query string intacto — os filtros da
 * tela de lançamentos não podem sumir quando a pessoa muda de mês.
 */
export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goTo(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mes', next);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const isCurrent = month === currentMonthKey();

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
      <button
        type="button"
        onClick={() => goTo(shiftMonthKey(month, -1))}
        aria-label="Mês anterior"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => goTo(currentMonthKey())}
        disabled={isCurrent}
        title={isCurrent ? undefined : 'Ir para o mês atual'}
        className="min-w-[9.5rem] rounded-lg px-2 py-1 text-center text-sm font-semibold text-fg transition-colors first-letter:uppercase enabled:hover:bg-surface-2"
      >
        {formatMonthKey(month)}
      </button>

      <button
        type="button"
        onClick={() => goTo(shiftMonthKey(month, 1))}
        aria-label="Próximo mês"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
