'use client';

import { useActionState, useState } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { contributeToGoalAction, deleteGoalAction } from '@/server/actions/planning';
import { idleState } from '@/server/actions/types';
import { Money } from '@/components/ui/money';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input } from '@/components/ui/field';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate, toDateInput, todayUtc } from '@/lib/date';

export interface GoalView {
  id: string;
  name: string;
  targetCents: number;
  savedCents: number;
  targetDate: Date | null;
  color: string;
}

/**
 * Cartão de meta.
 *
 * Uma meta é uma promessa que se cumpre em pequenos aportes, então o botão de
 * "guardar" fica sempre visível no cartão — não escondido atrás de um menu.
 */
export function GoalCard({
  goal,
  spaceId,
  currency,
}: {
  goal: GoalView;
  spaceId: string;
  currency: string;
}) {
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [contributeState, contributeAction] = useActionState(contributeToGoalAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteGoalAction, idleState);

  const percent = goal.targetCents > 0 ? (goal.savedCents / goal.targetCents) * 100 : 0;
  const remaining = Math.max(0, goal.targetCents - goal.savedCents);
  const done = goal.savedCents >= goal.targetCents;

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${goal.color}1a`, color: goal.color }}
        >
          <Target className="h-5 w-5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-fg">{goal.name}</h3>
          <p className="text-xs text-muted">
            {goal.targetDate ? `Para ${formatDate(goal.targetDate, { withYear: true })}` : 'Sem prazo'}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label={`Excluir meta ${goal.name}`}
          onClick={() => setConfirming(true)}
          className="text-subtle hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <Money cents={goal.savedCents} currency={currency} tone="neutral" size="md" />
          <span className="text-xs text-muted">
            de <Money cents={goal.targetCents} currency={currency} tone="muted" size="xs" />
          </span>
        </div>
        <Progress value={percent} tone={done ? 'income' : 'brand'} />
        <p className="mt-1.5 text-xs text-muted">
          {done ? (
            <span className="font-medium text-income">Meta alcançada 🎉</span>
          ) : (
            <>
              Faltam <Money cents={remaining} currency={currency} tone="muted" size="xs" /> ·{' '}
              {percent.toFixed(0)}%
            </>
          )}
        </p>
      </div>

      {adding ? (
        <form action={contributeAction} className="mt-4 space-y-2.5 border-t border-border pt-4">
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="goalId" value={goal.id} />

          <Field label="Quanto guardar" htmlFor={`amount-${goal.id}`} error={contributeState.fieldErrors?.amountCents}>
            <Input
              id={`amount-${goal.id}`}
              name="amountCents"
              inputMode="decimal"
              placeholder="0,00"
              autoFocus
              required
            />
          </Field>
          <input type="hidden" name="date" value={toDateInput(todayUtc())} />

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <SubmitButton className="flex-1" pendingLabel="Guardando…">
              Guardar
            </SubmitButton>
          </div>

          {contributeState.error && (
            <p role="alert" className="text-xs font-medium text-danger">
              {contributeState.error}
            </p>
          )}
        </form>
      ) : (
        <Button variant="outline" className="mt-4 w-full" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Guardar dinheiro
        </Button>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Excluir "${goal.name}"?`}
        description="A meta e o histórico de aportes serão removidos. Os lançamentos do extrato não são afetados."
        error={deleteState.error}
        onCancel={() => setConfirming(false)}
      >
        <form action={deleteAction}>
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="goalId" value={goal.id} />
          <Button type="submit" variant="danger" className="w-full">
            Excluir meta
          </Button>
        </form>
      </ConfirmDialog>
    </div>
  );
}
