'use client';

import { useActionState, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { deleteSettlementAction } from '@/server/actions/settlements';
import { idleState } from '@/server/actions/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function UndoSettlement({
  spaceId,
  settlementId,
}: {
  spaceId: string;
  settlementId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(deleteSettlementAction, idleState);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted hover:text-fg"
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        Desfazer
      </Button>

      <ConfirmDialog
        open={open}
        title="Desfazer este acerto?"
        description="As despesas voltam para o saldo em aberto e podem ser editadas de novo."
        error={state.error}
        onCancel={() => setOpen(false)}
      >
        <form action={formAction}>
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="settlementId" value={settlementId} />
          <Button type="submit" variant="danger" className="w-full">
            Desfazer acerto
          </Button>
        </form>
      </ConfirmDialog>
    </>
  );
}
