'use client';

import { useActionState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { revokeOtherSessionsAction } from '@/server/actions/auth';
import { idleState } from '@/server/actions/types';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';
import { formatDateShort } from '@/lib/date';

interface SessionRow {
  id: string;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

/** Resumo legível do user-agent, sem prometer precisão de fingerprint. */
function describeAgent(userAgent: string | null): { label: string; mobile: boolean } {
  if (!userAgent) return { label: 'Aparelho desconhecido', mobile: false };

  const mobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const browser = /Firefox/i.test(userAgent)
    ? 'Firefox'
    : /Edg/i.test(userAgent)
      ? 'Edge'
      : /Chrome/i.test(userAgent)
        ? 'Chrome'
        : /Safari/i.test(userAgent)
          ? 'Safari'
          : 'Navegador';

  const os = /Windows/i.test(userAgent)
    ? 'Windows'
    : /Android/i.test(userAgent)
      ? 'Android'
      : /iPhone|iPad|iOS/i.test(userAgent)
        ? 'iOS'
        : /Mac/i.test(userAgent)
          ? 'macOS'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : '';

  return { label: os ? `${browser} · ${os}` : browser, mobile };
}

export function SessionsPanel({ sessions }: { sessions: SessionRow[] }) {
  const [state, formAction] = useActionState(revokeOtherSessionsAction, idleState);

  return (
    <div className="space-y-4">
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <ul className="space-y-2.5">
        {sessions.map((session) => {
          const { label, mobile } = describeAgent(session.userAgent);
          return (
            <li key={session.id} className="flex items-center gap-2.5">
              {mobile ? (
                <Smartphone className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              ) : (
                <Monitor className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-fg">{label}</span>
                <span className="block text-2xs text-muted">
                  ativo em {formatDateShort(session.lastSeenAt)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {sessions.length > 1 && (
        <form action={formAction}>
          <SubmitButton variant="outline" size="sm" pendingLabel="Encerrando…">
            Encerrar as outras sessões
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
