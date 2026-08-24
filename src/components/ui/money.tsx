import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/money';

type Tone = 'auto' | 'income' | 'expense' | 'transfer' | 'neutral' | 'muted' | 'brand';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

const TONE_CLASS: Record<Tone, string> = {
  auto: '',
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-transfer',
  neutral: 'text-fg',
  muted: 'text-muted',
  brand: 'text-brand',
};

/**
 * Escala tipográfica do dinheiro.
 *
 * Os tamanhos grandes usam tracking negativo (definido nos tokens
 * `money-*`): em corpo alto, o espaçamento padrão faz o número parecer
 * esparramado. Os pequenos ficam no tamanho normal de texto para não brigar
 * com o rótulo ao lado.
 */
const SIZE_CLASS: Record<Size, string> = {
  xs: 'text-xs font-semibold',
  sm: 'text-sm font-semibold',
  md: 'text-money-sm font-semibold',
  lg: 'text-money font-semibold',
  xl: 'text-money-lg font-bold',
  hero: 'text-money-xl font-bold',
};

/**
 * Exibição de valores monetários.
 *
 * Três decisões que valem explicar:
 *
 * 1. `tabular` (dígitos de largura fixa) sempre. Sem isso uma coluna de
 *    valores fica serrilhada e impossível de comparar de relance.
 * 2. O símbolo da moeda e os centavos entram em peso menor que os reais.
 *    O olho procura a ordem de grandeza primeiro; "R$" e ",90" são
 *    contexto, não informação.
 * 3. `signed` mostra − explicitamente. Quem passa o olho no extrato precisa
 *    distinguir saída de entrada sem depender só da cor — daltônicos são
 *    ~8% dos homens.
 */
export function Money({
  cents,
  currency = 'BRL',
  tone = 'auto',
  signed = false,
  className,
  size = 'md',
  /** Reduz o símbolo e os centavos. Ligado nos tamanhos grandes. */
  refined,
}: {
  cents: number;
  currency?: string;
  tone?: Tone;
  signed?: boolean;
  className?: string;
  size?: Size;
  refined?: boolean;
}) {
  const resolvedTone: Tone =
    tone === 'auto' ? (cents > 0 ? 'income' : cents < 0 ? 'expense' : 'neutral') : tone;

  const sign = signed && cents !== 0 ? (cents > 0 ? '+' : '−') : '';
  const formatted = formatCents(signed ? Math.abs(cents) : cents, currency);

  const useRefined = refined ?? ['lg', 'xl', 'hero'].includes(size);

  if (!useRefined) {
    return (
      <span className={cn('tabular', TONE_CLASS[resolvedTone], SIZE_CLASS[size], className)}>
        {sign}
        {sign ? ' ' : ''}
        {formatted}
      </span>
    );
  }

  // Separa "R$", parte inteira e centavos para dar pesos diferentes a cada um.
  const match = /^(\D*)\s?([\d.\s ]+)([,.]\d{2})?(.*)$/.exec(formatted);
  const [, symbol = '', integer = formatted, decimals = '', suffix = ''] = match ?? [];

  return (
    <span
      className={cn(
        'tabular inline-flex items-baseline gap-[0.15em]',
        TONE_CLASS[resolvedTone],
        SIZE_CLASS[size],
        className,
      )}
    >
      {sign && <span>{sign}</span>}
      {symbol && <span className="text-[0.62em] font-semibold opacity-65">{symbol.trim()}</span>}
      <span>
        {integer.trim()}
        {decimals && <span className="text-[0.68em] opacity-70">{decimals}</span>}
      </span>
      {suffix && <span className="text-[0.62em] opacity-65">{suffix}</span>}
    </span>
  );
}
