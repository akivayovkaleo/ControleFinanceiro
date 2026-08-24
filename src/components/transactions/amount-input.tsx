'use client';

import { useId, useState } from 'react';
import { formatCents, parseAmountToCents } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * Campo de valor.
 *
 * Não formata enquanto a pessoa digita: reescrever o texto sob o cursor é uma
 * das interações mais irritantes que existem (o cursor pula, apagar vira
 * loteria). Em vez disso, aceitamos qualquer forma razoável — "89,90",
 * "89.90", "1.234,56" — e mostramos embaixo como o sistema entendeu. A
 * conversão de verdade é feita no servidor pelo mesmo `parseAmountToCents`.
 */
export function AmountInput({
  name,
  defaultValue,
  currency,
  tone = 'expense',
  error,
  autoFocus,
  onValueChange,
}: {
  name: string;
  defaultValue?: string;
  currency: string;
  tone?: 'income' | 'expense' | 'transfer';
  error?: boolean;
  autoFocus?: boolean;
  /** Recebe o texto cru a cada tecla — o pai usa para a prévia da divisão. */
  onValueChange?: (raw: string) => void;
}) {
  const id = useId();
  const [raw, setRaw] = useState(defaultValue ?? '');

  function handleChange(value: string) {
    setRaw(value);
    onValueChange?.(value);
  }

  const cents = parseAmountToCents(raw);
  const preview = cents !== null && raw.trim() !== '' ? formatCents(cents, currency) : null;

  const TONE: Record<string, string> = {
    income: 'text-income',
    expense: 'text-expense',
    transfer: 'text-transfer',
  };

  return (
    <div>
      <label htmlFor={id} className="label-base">
        Valor
      </label>
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl border bg-surface px-4 py-3 transition-colors',
          'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
          error ? 'border-danger' : 'border-border',
        )}
      >
        <span className={cn('text-xl font-semibold', TONE[tone])}>
          {currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '€'}
        </span>
        <input
          id={id}
          name={name}
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          autoFocus={autoFocus}
          required
          aria-invalid={error || undefined}
          aria-describedby={preview ? `${id}-preview` : undefined}
          className={cn(
            'tabular w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-subtle',
            TONE[tone],
          )}
        />
      </div>
      {preview && (
        <p id={`${id}-preview`} className="mt-1.5 text-xs text-muted">
          Será registrado como <span className="font-medium text-fg">{preview}</span>
        </p>
      )}
    </div>
  );
}
