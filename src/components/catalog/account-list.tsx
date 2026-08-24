'use client';

import { useActionState, useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react';
import {
  deleteAccountAction,
  toggleAccountArchiveAction,
} from '@/server/actions/catalog';
import { idleState } from '@/server/actions/types';
import { ACCOUNT_TYPE_LABELS } from '@/lib/presets';
import { Money } from '@/components/ui/money';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AccountForm } from './account-form';
import type { AccountBalance } from '@/server/queries/accounts';

export function AccountList({
  accounts,
  spaceId,
  currency,
  members,
}: {
  accounts: AccountBalance[];
  spaceId: string;
  currency: string;
  members: Array<{ id: string; displayName: string }>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archiveState, archiveAction] = useActionState(toggleAccountArchiveAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteAccountAction, idleState);

  return (
    <ul className="space-y-3">
      {accounts.map((account) => {
        if (editingId === account.id) {
          return (
            <li key={account.id}>
              <AccountForm
                spaceId={spaceId}
                members={members}
                onDone={() => setEditingId(null)}
                initial={{
                  id: account.id,
                  name: account.name,
                  type: account.type,
                  openingBalance: (account.openingBalanceCents / 100)
                    .toFixed(2)
                    .replace('.', ','),
                  ownerMembershipId: account.ownerMembershipId ?? '',
                  creditLimit:
                    account.creditLimitCents !== null
                      ? (account.creditLimitCents / 100).toFixed(2).replace('.', ',')
                      : '',
                  statementDay: account.statementDay?.toString() ?? '',
                  dueDay: account.dueDay?.toString() ?? '',
                  color: account.color,
                }}
              />
            </li>
          );
        }

        const owner = members.find((m) => m.id === account.ownerMembershipId);
        const limitPercent =
          account.creditLimitCents && account.creditLimitCents > 0 && account.usedLimitCents !== null
            ? (account.usedLimitCents / account.creditLimitCents) * 100
            : null;

        return (
          <li key={account.id} className="card p-4">
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: account.color }}
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-fg">{account.name}</h3>
                  {account.archived && <Badge>Arquivada</Badge>}
                  {owner ? (
                    <Badge tone="brand">{owner.displayName}</Badge>
                  ) : members.length > 1 ? (
                    <Badge tone="neutral">Conjunta</Badge>
                  ) : null}
                </div>

                <p className="mt-0.5 text-xs text-muted">
                  {ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS] ??
                    account.type}
                  {account.dueDay ? ` · vence dia ${account.dueDay}` : ''}
                  {' · '}
                  {account.transactionCount} lançamento
                  {account.transactionCount === 1 ? '' : 's'}
                </p>

                {limitPercent !== null && (
                  <div className="mt-2.5 max-w-xs">
                    <Progress
                      value={limitPercent}
                      showOverflow
                      tone={limitPercent >= 80 ? 'warning' : 'brand'}
                    />
                    <p className="mt-1 text-2xs text-muted">
                      <Money
                        cents={account.usedLimitCents ?? 0}
                        currency={currency}
                        tone="muted"
                        size="xs"
                      />{' '}
                      de{' '}
                      <Money
                        cents={account.creditLimitCents ?? 0}
                        currency={currency}
                        tone="muted"
                        size="xs"
                      />{' '}
                      do limite
                    </p>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <Money
                  cents={account.balanceCents}
                  currency={currency}
                  tone={account.balanceCents < 0 ? 'expense' : 'neutral'}
                  size="md"
                />

                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${account.name}`}
                    onClick={() => setEditingId(account.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>

                  <form action={archiveAction}>
                    <input type="hidden" name="spaceId" value={spaceId} />
                    <input type="hidden" name="accountId" value={account.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      aria-label={account.archived ? 'Reativar' : 'Arquivar'}
                      title={account.archived ? 'Reativar' : 'Arquivar'}
                    >
                      {account.archived ? (
                        <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Archive className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </Button>
                  </form>

                  {account.transactionCount === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir ${account.name}`}
                      onClick={() => setDeletingId(account.id)}
                      className="text-subtle hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {archiveState.error && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {archiveState.error}
              </p>
            )}

            <ConfirmDialog
              open={deletingId === account.id}
              title={`Excluir "${account.name}"?`}
              description="Esta conta não tem lançamentos, então pode ser removida com segurança."
              error={deleteState.error}
              onCancel={() => setDeletingId(null)}
            >
              <form action={deleteAction}>
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="accountId" value={account.id} />
                <Button type="submit" variant="danger" className="w-full">
                  Excluir conta
                </Button>
              </form>
            </ConfirmDialog>
          </li>
        );
      })}
    </ul>
  );
}
