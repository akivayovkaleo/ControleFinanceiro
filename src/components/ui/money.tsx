import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/money';

/**
 * Exibição de valores monetários.
 *
 * `tone` controla a cor semântica; `signed` mostra + / − explicitamente, o que
 * evita ambiguidade no extrato (uma despesa aparece como "− R$ 50,00").
 */
export function Money({
  cents,
  currency = 'BRL',
  tone = 'auto',
  signed = false,
  className,
  size = 'md',
}: {
  cents: number;
  currency?: string;
  tone?: 'auto' | 'income' | 'expense' | 'transfer' | 'neutral' | 'muted';
  signed?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  const resolvedTone =
    tone === 'auto' ? (cents > 0 ? 'income' : cents < 0 ? 'expense' : 'neutral') : tone;

  const TONE_CLASS: Record<string, string> = {
    income: 'text-income',
    expense: 'text-expense',
    transfer: 'text-transfer',
    neutral: 'text-fg',
    muted: 'text-muted',
  };

  const SIZE_CLASS: Record<string, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  const sign = signed && cents !== 0 ? (cents > 0 ? '+' : '−') : '';
  const display = formatCents(signed ? Math.abs(cents) : cents, currency);

  return (
    <span
      className={cn('tabular font-semibold', TONE_CLASS[resolvedTone], SIZE_CLASS[size], className)}
    >
      {sign}
      {sign ? ' ' : ''}
      {display}
    </span>
  );
}
