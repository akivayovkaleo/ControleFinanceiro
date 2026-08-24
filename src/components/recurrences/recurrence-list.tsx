'use client';

import { useActionState, useState } from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import {
  deleteRecurrenceAction,
  toggleRecurrenceAction,
} from '@/server/actions/recurrences';
import { idleState } from '@/server/actions/types';
import { FREQUENCY_LABELS, formatDateShort, formatRelativeDay, type Frequency } from '@/lib/date';
import { Money } from '@/components/ui/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export interface RecurrenceItem {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amountCents: number;
  description: string;
  frequency: Frequency;
  nextRunAt: Date;
  endsAt: Date | null;
  active: boolean;
  accountName: string;
  categoryName: string | null;
  generatedCount: number;
}

export function RecurrenceList({
  recurrences,
  spaceId,
  currency,
}: {
  recurrences: RecurrenceItem[];
  spaceId: string;
  currency: string;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, toggleAction] = useActionState(toggleRecurrenceAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteRecurrenceAction, idleState);

  return (
    <ul className="space-y-3">
      {recurrences.map((recurrence) => (
        <li key={recurrence.id} className="card flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-fg">
                {recurrence.description}
              </h3>
              <Badge tone={recurrence.type === 'INCOME' ? 'income' : 'expense'}>
                {FREQUENCY_LABELS[recurrence.frequency]}
              </Badge>
              {!recurrence.active && <Badge>Pausada</Badge>}
            </div>

            <p className="mt-0.5 text-xs text-muted">
              {[recurrence.categoryName, recurrence.accountName].filter(Boolean).join(' · ')}
              {' · '}
              {recurrence.active ? (
                <>próxima {formatRelativeDay(recurrence.nextRunAt)}</>
              ) : (
                <>parada em {formatDateShort(recurrence.nextRunAt)}</>
              )}
              {recurrence.generatedCount > 0 &&
                ` · ${recurrence.generatedCount} já gerado${recurrence.generatedCount > 1 ? 's' : ''}`}
            </p>
          </div>

          <Money
            cents={recurrence.amountCents}
            currency={currency}
            tone={recurrence.type === 'INCOME' ? 'income' : 'expense'}
            size="sm"
          />

          <div className="flex shrink-0 items-center gap-0.5">
            <form action={toggleAction}>
              <input type="hidden" name="spaceId" value={spaceId} />
              <input type="hidden" name="recurrenceId" value={recurrence.id} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label={recurrence.active ? 'Pausar' : 'Reativar'}
                title={recurrence.active ? 'Pausar' : 'Reativar'}
              >
                {recurrence.active ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden />
                )}
              </Button>
            </form>

            <Button
              variant="ghost"
              size="icon"
              aria-label={`Excluir ${recurrence.description}`}
              onClick={() => setDeletingId(recurrence.id)}
              className="text-subtle hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>

          <ConfirmDialog
            open={deletingId === recurrence.id}
            title={`Excluir "${recurrence.description}"?`}
            description="Os lançamentos já gerados continuam no extrato. Só o modelo é removido."
            error={deleteState.error}
            onCancel={() => setDeletingId(null)}
          >
            <form action={deleteAction}>
              <input type="hidden" name="spaceId" value={spaceId} />
              <input type="hidden" name="recurrenceId" value={recurrence.id} />
              <Button type="submit" variant="danger" className="w-full">
                Excluir recorrência
              </Button>
            </form>
          </ConfirmDialog>
        </li>
      ))}
    </ul>
  );
}
