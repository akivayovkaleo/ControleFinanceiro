'use client';

import { useActionState } from 'react';
import { CopyPlus } from 'lucide-react';
import { copyBudgetsAction } from '@/server/actions/planning';
import { idleState } from '@/server/actions/types';
import { SubmitButton } from '@/components/ui/submit-button';
import { formatMonthKeyShort } from '@/lib/date';

/** Copia os limites do mês anterior — evita redigitar tudo todo mês. */
export function CopyBudgets({
  spaceId,
  fromMonth,
  toMonth,
}: {
  spaceId: string;
  fromMonth: string;
  toMonth: string;
}) {
  const [state, formAction] = useActionState(copyBudgetsAction, idleState);

  return (
    <form action={formAction}>
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="fromMonth" value={fromMonth} />
      <input type="hidden" name="toMonth" value={toMonth} />
      <SubmitButton variant="outline" size="sm" pendingLabel="Copiando…">
        <CopyPlus className="h-3.5 w-3.5" aria-hidden />
        Copiar de {formatMonthKeyShort(fromMonth)}
      </SubmitButton>
      {state.error && (
        <p role="alert" className="mt-1 text-2xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
