'use client';

import { useActionState, useState } from 'react';
import { LogOut } from 'lucide-react';
import { leaveSpaceAction } from '@/server/actions/spaces';
import { idleState } from '@/server/actions/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function LeaveSpace({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(leaveSpaceAction, idleState);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="text-danger">
        <LogOut className="h-4 w-4" aria-hidden />
        Sair do espaço
      </Button>

      <ConfirmDialog
        open={open}
        title={`Sair de "${spaceName}"?`}
        description="Você deixa de ver os dados deste espaço. Para voltar, precisará de um novo convite."
        error={state.error}
        onCancel={() => setOpen(false)}
      >
        <form action={formAction}>
          <input type="hidden" name="spaceId" value={spaceId} />
          <Button type="submit" variant="danger" className="w-full">
            Sair do espaço
          </Button>
        </form>
      </ConfirmDialog>
    </>
  );
}
