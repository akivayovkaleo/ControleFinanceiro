'use client';

import { useActionState, useState } from 'react';
import { Handshake } from 'lucide-react';
import { createSettlementAction } from '@/server/actions/settlements';
import { idleState } from '@/server/actions/types';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toDateInput, todayUtc } from '@/lib/date';

/**
 * Registrar o acerto.
 *
 * Confirmação obrigatória porque a operação carimba TODAS as despesas do
 * período — elas ficam travadas para edição depois disso. É reversível
 * (dá para desfazer), mas não é algo para acontecer por clique acidental.
 */
export function SettleForm({
  spaceId,
  periodStart,
  disabled,
}: {
  spaceId: string;
  periodStart: Date | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createSettlementAction, idleState);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled} size="lg" className="w-full">
        <Handshake className="h-4 w-4" aria-hidden />
        Registrar acerto
      </Button>

      <ConfirmDialog
        open={open}
        title="Registrar o acerto de contas?"
        description="As despesas deste período saem do saldo em aberto e ficam travadas para edição. Você pode desfazer depois."
        error={state.error}
        onCancel={() => setOpen(false)}
      >
        <form action={formAction} className="space-y-3 text-left">
          <input type="hidden" name="spaceId" value={spaceId} />
          <input
            type="hidden"
            name="periodStart"
            value={toDateInput(periodStart ?? todayUtc())}
          />

          <Field label="Acertado até" htmlFor="periodEnd" error={state.fieldErrors?.periodEnd}>
            <Input
              id="periodEnd"
              name="periodEnd"
              type="date"
              defaultValue={toDateInput(todayUtc())}
              required
            />
          </Field>

          <Field label="Observação" htmlFor="note" hint="Opcional — ex.: “Pix feito no dia 5”.">
            <Input id="note" name="note" maxLength={200} placeholder="Como foi pago" />
          </Field>

          {state.ok && <Alert tone="success">{state.message}</Alert>}

          <SubmitButton className="w-full" pendingLabel="Registrando…">
            Confirmar acerto
          </SubmitButton>
        </form>
      </ConfirmDialog>
    </>
  );
}
