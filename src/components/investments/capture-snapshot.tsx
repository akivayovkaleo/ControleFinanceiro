'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { captureNetWorthSnapshotAction } from '@/server/actions/investments';
import { idleState } from '@/server/actions/types';
import { SubmitButton } from '@/components/ui/submit-button';

/**
 * Registra o patrimônio de hoje.
 *
 * É um botão, e não algo automático, porque a curva não dá para reconstruir
 * depois: a cotação que uma posição tinha em março some no instante em que ela
 * é atualizada em abril. Fotografar é o que cria o histórico.
 */
export function CaptureSnapshot({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(captureNetWorthSnapshotAction, idleState);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="spaceId" value={spaceId} />
      <SubmitButton variant="outline" pendingLabel="Registrando…">
        <Camera className="h-4 w-4" aria-hidden />
        Registrar hoje
      </SubmitButton>
    </form>
  );
}
