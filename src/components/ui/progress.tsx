import { cn } from '@/lib/utils';

/**
 * Barra de progresso para orçamentos e metas.
 *
 * Passa de 100% de propósito: um orçamento estourado precisa PARECER
 * estourado, então a barra fica vermelha e o excedente é mostrado.
 */
export function Progress({
  value,
  tone = 'brand',
  className,
  showOverflow = false,
}: {
  /** Percentual (pode passar de 100). */
  value: number;
  tone?: 'brand' | 'income' | 'warning' | 'danger';
  className?: string;
  showOverflow?: boolean;
}) {
  const clamped = Math.max(0, Math.min(value, 100));
  const overflow = showOverflow && value > 100;

  const TONES: Record<string, string> = {
    brand: 'bg-brand',
    income: 'bg-income',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };

  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          overflow ? 'bg-danger' : TONES[tone],
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
