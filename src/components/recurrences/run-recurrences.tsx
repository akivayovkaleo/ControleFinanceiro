'use client';

import { useActionState } from 'react';
import { RefreshCw } from 'lucide-react';
import { runRecurrencesAction } from '@/server/actions/recurrences';
import { idleState } from '@/server/actions/types';
import { SubmitButton } from '@/components/ui/submit-button';

/** Força a geração das ocorrências vencidas agora. */
export function RunRecurrences({ spaceId }: { spaceId: string }) {
  const [state, formAction] = useActionState(runRecurrencesAction, idleState);

  return (
    <form action={formAction}>
      <input type="hidden" name="spaceId" value={spaceId} />
      <SubmitButton variant="outline" pendingLabel="Gerando…" title="Gerar lançamentos vencidos">
        <RefreshCw className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Gerar agora</span>
      </SubmitButton>
      {state.message && <p className="mt-1 text-2xs text-muted">{state.message}</p>}
    </form>
  );
}
