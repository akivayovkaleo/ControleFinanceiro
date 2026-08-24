'use client';

import { useActionState, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { setBudgetAction, deleteBudgetAction } from '@/server/actions/planning';
import { idleState } from '@/server/actions/types';
import { Money } from '@/components/ui/money';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/utils';

export interface BudgetRow {
  budgetId: string | null;
  categoryId: string;
  categoryName: string;
  color: string;
  limitCents: number;
  spentCents: number;
  percent: number;
  status: 'ok' | 'atencao' | 'estourado';
}

/**
 * Linha de orçamento editável no lugar.
 *
 * Definir orçamento é uma tarefa de "passar por vários de uma vez". Abrir um
 * modal por categoria tornaria isso insuportável, então a edição acontece
 * direto na linha.
 */
export function BudgetEditor({
  spaceId,
  month,
  row,
  currency,
}: {
  spaceId: string;
  month: string;
  row: BudgetRow;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saveState, saveAction] = useActionState(setBudgetAction, idleState);
  const [, deleteAction] = useActionState(deleteBudgetAction, idleState);

  const hasBudget = row.budgetId !== null;
  const remaining = row.limitCents - row.spentCents;

  const STATUS_TONE = {
    ok: 'brand',
    atencao: 'warning',
    estourado: 'danger',
  } as const;

  return (
    <li className="border-b border-border py-4 last:border-0 last:pb-0">
      <div className="flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: row.color }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
          {row.categoryName}
        </span>

        {editing ? (
          <form action={saveAction} className="flex items-center gap-1.5">
            <input type="hidden" name="spaceId" value={spaceId} />
            <input type="hidden" name="categoryId" value={row.categoryId} />
            <input type="hidden" name="month" value={month} />
            <input
              name="limitCents"
              defaultValue={
                hasBudget ? (row.limitCents / 100).toFixed(2).replace('.', ',') : ''
              }
              inputMode="decimal"
              autoFocus
              placeholder="0,00"
              aria-label={`Limite de ${row.categoryName}`}
              className="tabular w-28 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-right text-sm outline-none focus:border-brand"
            />
            <SubmitButton size="icon" aria-label="Salvar">
              <Check className="h-4 w-4" aria-hidden />
            </SubmitButton>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(false)}
              aria-label="Cancelar"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            {hasBudget ? (
              <span className="text-sm text-muted">
                <Money cents={row.spentCents} currency={currency} tone="muted" size="sm" /> de{' '}
                <Money cents={row.limitCents} currency={currency} tone="neutral" size="sm" />
              </span>
            ) : (
              <span className="text-sm text-subtle">Sem limite</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              aria-label={`Definir orçamento de ${row.categoryName}`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        )}
      </div>

      {hasBudget && (
        <>
          <Progress
            value={row.percent}
            tone={STATUS_TONE[row.status]}
            showOverflow
            className="mt-2.5"
          />
          <p
            className={cn(
              'mt-1.5 text-xs',
              row.status === 'estourado'
                ? 'font-medium text-danger'
                : row.status === 'atencao'
                  ? 'font-medium text-warning'
                  : 'text-muted',
            )}
          >
            {remaining >= 0 ? (
              <>
                Ainda cabem <Money cents={remaining} currency={currency} tone="muted" size="xs" />
              </>
            ) : (
              <>
                Passou <Money cents={-remaining} currency={currency} tone="expense" size="xs" /> do
                limite
              </>
            )}
          </p>
        </>
      )}

      {saveState.error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {saveState.error}
        </p>
      )}

      {hasBudget && !editing && (
        <form action={deleteAction} className="mt-1">
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="budgetId" value={row.budgetId!} />
          <button
            type="submit"
            className="text-2xs text-subtle transition-colors hover:text-danger"
          >
            Remover orçamento
          </button>
        </form>
      )}
    </li>
  );
}
