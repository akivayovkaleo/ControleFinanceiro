import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Money } from '@/components/ui/money';
import { cn } from '@/lib/utils';

/**
 * Cartão de indicador.
 *
 * Hierarquia deliberada: o número é o herói, o rótulo fica pequeno e em
 * caixa alta discreta acima dele, e a variação vem por último em pílula.
 * Quem abre o painel quer o número — o resto é contexto.
 *
 * A sutileza que mais importa: gastar MENOS é bom, gastar MAIS é ruim — o
 * inverso da receita. Sem `invertDelta`, uma despesa que subiu apareceria
 * em verde, dizendo exatamente o oposto do que aconteceu.
 */
export function StatCard({
  label,
  cents,
  currency,
  tone = 'neutral',
  previousCents,
  invertDelta = false,
  icon,
  hint,
  accent,
}: {
  label: string;
  cents: number;
  currency: string;
  tone?: 'income' | 'expense' | 'neutral' | 'auto';
  previousCents?: number;
  invertDelta?: boolean;
  icon?: ReactNode;
  hint?: string;
  /** Faixa colorida no topo, para o cartão de destaque. */
  accent?: 'income' | 'expense' | 'brand';
}) {
  const hasDelta = previousCents !== undefined && previousCents !== 0;
  const deltaPercent = hasDelta ? ((cents - previousCents) / Math.abs(previousCents)) * 100 : 0;
  const rose = deltaPercent > 0.5;
  const fell = deltaPercent < -0.5;
  const flat = !rose && !fell;
  const good = invertDelta ? fell : rose;

  const ACCENT: Record<string, string> = {
    income: 'before:bg-income',
    expense: 'before:bg-expense',
    brand: 'before:bg-brand',
  };

  return (
    <div
      className={cn(
        'card surface-sheen relative overflow-hidden p-4 sm:p-5',
        accent &&
          cn(
            'before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-[""]',
            ACCENT[accent],
          ),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-subtle">{label}</p>
        {icon && <span className="text-subtle/70">{icon}</span>}
      </div>

      <div className="mt-2.5">
        <Money cents={cents} currency={currency} tone={tone} size="xl" />
      </div>

      {hasDelta ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-2xs font-semibold',
              flat
                ? 'bg-surface-2 text-muted'
                : good
                  ? 'bg-income-soft text-income'
                  : 'bg-expense-soft text-expense',
            )}
          >
            {rose ? (
              <ArrowUp className="h-3 w-3" aria-hidden />
            ) : fell ? (
              <ArrowDown className="h-3 w-3" aria-hidden />
            ) : (
              <Minus className="h-3 w-3" aria-hidden />
            )}
            {Math.abs(deltaPercent).toFixed(0)}%
          </span>
          <span className="text-2xs text-subtle">vs. mês anterior</span>
        </div>
      ) : hint ? (
        <p className="mt-2.5 text-2xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
