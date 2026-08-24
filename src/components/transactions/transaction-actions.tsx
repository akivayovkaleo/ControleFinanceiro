'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Trash2 } from 'lucide-react';
import {
  deleteTransactionAction,
  duplicateTransactionAction,
} from '@/server/actions/transactions';
import { idleState } from '@/server/actions/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/** Duplicar e excluir, na tela de edição. */
export function TransactionActions({
  spaceId,
  transactionId,
  locked,
}: {
  spaceId: string;
  transactionId: string;
  locked: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleteState, deleteFormAction] = useActionState(deleteTransactionAction, idleState);
  const [duplicateState, duplicateFormAction] = useActionState(
    duplicateTransactionAction,
    idleState,
  );

  useEffect(() => {
    if (deleteState.ok) {
      router.push(`/lancamentos?space=${spaceId}`);
      router.refresh();
    }
  }, [deleteState.ok, router, spaceId]);

  useEffect(() => {
    const newId = duplicateState.data?.transactionId;
    if (duplicateState.ok && typeof newId === 'string') {
      router.push(`/lancamentos/${newId}?space=${spaceId}`);
      router.refresh();
    }
  }, [duplicateState.ok, duplicateState.data, router, spaceId]);

  return (
    <div className="flex items-center gap-2">
      <form action={duplicateFormAction}>
        <input type="hidden" name="spaceId" value={spaceId} />
        <input type="hidden" name="transactionId" value={transactionId} />
        <Button type="submit" variant="ghost" size="icon" title="Duplicar" aria-label="Duplicar">
          <Copy className="h-4 w-4" aria-hidden />
        </Button>
      </form>

      <Button
        variant="ghost"
        size="icon"
        title={locked ? 'Faz parte de um acerto de contas' : 'Excluir'}
        aria-label="Excluir"
        disabled={locked}
        onClick={() => setConfirming(true)}
        className="text-danger hover:bg-danger-soft"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>

      <ConfirmDialog
        open={confirming}
        title="Excluir este lançamento?"
        description="Ele sai do extrato, dos saldos e dos relatórios. Não dá para desfazer."
        confirmLabel="Excluir"
        error={deleteState.error}
        onCancel={() => setConfirming(false)}
      >
        <form action={deleteFormAction}>
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="transactionId" value={transactionId} />
          <Button type="submit" variant="danger" className="w-full">
            Excluir lançamento
          </Button>
        </form>
      </ConfirmDialog>
    </div>
  );
}
