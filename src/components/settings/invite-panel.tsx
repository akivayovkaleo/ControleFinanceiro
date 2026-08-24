'use client';

import { useActionState, useState } from 'react';
import { Check, Copy, Ticket, X } from 'lucide-react';
import { createInviteAction, revokeInviteAction } from '@/server/actions/spaces';
import { idleState } from '@/server/actions/types';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatDateShort } from '@/lib/date';

export interface InviteRow {
  id: string;
  codeHint: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * Convites.
 *
 * O código em claro aparece UMA vez, logo depois de gerar — o banco só guarda
 * o hash. Isso significa que um vazamento do banco não entrega acesso a
 * espaço nenhum. Se a pessoa perder o código, gera outro; é barato.
 */
export function InvitePanel({
  spaceId,
  invites,
}: {
  spaceId: string;
  invites: InviteRow[];
}) {
  const [createState, createAction] = useActionState(createInviteAction, idleState);
  const [revokeState, revokeAction] = useActionState(revokeInviteAction, idleState);
  const [copied, setCopied] = useState(false);

  const freshCode = typeof createState.data?.code === 'string' ? createState.data.code : null;
  const pending = invites.filter(
    (i) => !i.acceptedAt && !i.revokedAt && i.expiresAt.getTime() > Date.now(),
  );

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de clipboard: o código continua visível para copiar à mão.
    }
  }

  return (
    <div className="space-y-4">
      {freshCode && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft p-4">
          <p className="text-sm font-semibold text-brand">Convite criado</p>
          <p className="mt-1 text-xs text-brand/80">
            Compartilhe este código. Ele vale por 7 dias e só pode ser usado uma vez —
            depois de fechar esta tela, não dá para vê-lo de novo.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <code className="tabular flex-1 rounded-lg bg-surface px-3 py-2.5 text-center text-lg font-bold tracking-widest text-fg">
              {freshCode}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyCode(freshCode)}
              aria-label="Copiar código"
            >
              {copied ? (
                <Check className="h-4 w-4 text-income" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      )}

      {createState.error && <Alert tone="error">{createState.error}</Alert>}
      {revokeState.error && <Alert tone="error">{revokeState.error}</Alert>}

      <form action={createAction}>
        <input type="hidden" name="spaceId" value={spaceId} />
        <SubmitButton variant="outline" pendingLabel="Gerando…">
          <Ticket className="h-4 w-4" aria-hidden />
          Gerar convite
        </SubmitButton>
      </form>

      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((invite) => (
            <li
              key={invite.id}
              className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5"
            >
              <code className="tabular text-sm text-muted">•••• {invite.codeHint}</code>
              <Badge tone="warning">Aguardando</Badge>
              <span className="ml-auto text-2xs text-muted">
                expira {formatDateShort(invite.expiresAt)}
              </span>
              <form action={revokeAction}>
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="inviteId" value={invite.id} />
                <button
                  type="submit"
                  aria-label="Cancelar convite"
                  title="Cancelar convite"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
