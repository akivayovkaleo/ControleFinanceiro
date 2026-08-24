import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Money } from '@/components/ui/money';
import { cn } from '@/lib/utils';

/**
 * Cartão de indicador.
 *
 * A variação em relação ao mês anterior tem uma sutileza importante: gastar
 * MENOS é bom, gastar MAIS é ruim — o inverso da receita. Por isso
 * `invertDelta`: sem ele, uma despesa que subiu apareceria em verde.
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
}: {
  label: string;
  cents: number;
  currency: string;
  tone?: 'income' | 'expense' | 'neutral' | 'auto';
  previousCents?: number;
  invertDelta?: boolean;
  icon?: ReactNode;
  hint?: string;
}) {
  const hasDelta = previousCents !== undefined && previousCents !== 0;
  const deltaPercent = hasDelta ? ((cents - previousCents) / Math.abs(previousCents)) * 100 : 0;
  const rose = deltaPercent > 0.5;
  const fell = deltaPercent < -0.5;
  const good = invertDelta ? fell : rose;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <span className="text-subtle">{icon}</span>}
      </div>

      <div className="mt-2">
        <Money cents={cents} currency={currency} tone={tone} size="lg" />
      </div>

      {hasDelta ? (
        <p
          className={cn(
            'mt-1.5 flex items-center gap-1 text-xs font-medium',
            !rose && !fell ? 'text-muted' : good ? 'text-income' : 'text-expense',
          )}
        >
          {rose ? (
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          ) : fell ? (
            <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Minus className="h-3.5 w-3.5" aria-hidden />
          )}
          {Math.abs(deltaPercent).toFixed(0)}% em relação ao mês anterior
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
