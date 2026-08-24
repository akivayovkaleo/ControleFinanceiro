'use client';

import { useActionState, useState } from 'react';
import { Pencil, UserMinus } from 'lucide-react';
import { removeMemberAction, updateMemberAction } from '@/server/actions/spaces';
import { idleState } from '@/server/actions/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input } from '@/components/ui/field';
import { ColorPicker } from '@/components/ui/color-picker';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Money } from '@/components/ui/money';
import { Alert } from '@/components/ui/alert';

export interface MemberRow {
  id: string;
  displayName: string;
  color: string;
  role: 'OWNER' | 'MEMBER';
  monthlyIncomeCents: number | null;
  isSelf: boolean;
}

export function MemberList({
  spaceId,
  members,
  currency,
  canManage,
}: {
  spaceId: string;
  members: MemberRow[];
  currency: string;
  canManage: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updateState, updateAction] = useActionState(updateMemberAction, idleState);
  const [removeState, removeAction] = useActionState(removeMemberAction, idleState);

  return (
    <div className="space-y-3">
      {updateState.error && <Alert tone="error">{updateState.error}</Alert>}
      {updateState.message && <Alert tone="success">{updateState.message}</Alert>}

      <ul className="space-y-3">
        {members.map((member) =>
          editingId === member.id ? (
            <li key={member.id} className="rounded-xl border border-border p-4">
              <form action={updateAction} className="space-y-4">
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="membershipId" value={member.id} />

                <Field
                  label="Como você aparece neste espaço"
                  htmlFor={`name-${member.id}`}
                  error={updateState.fieldErrors?.displayName}
                  required
                >
                  <Input
                    id={`name-${member.id}`}
                    name="displayName"
                    defaultValue={member.displayName}
                    maxLength={40}
                    autoFocus
                    required
                  />
                </Field>

                <Field
                  label="Renda mensal"
                  htmlFor={`income-${member.id}`}
                  error={updateState.fieldErrors?.monthlyIncomeCents}
                  hint="Opcional. Usada só na divisão proporcional à renda — não aparece em relatório nenhum."
                >
                  <Input
                    id={`income-${member.id}`}
                    name="monthlyIncomeCents"
                    inputMode="decimal"
                    defaultValue={
                      member.monthlyIncomeCents !== null
                        ? (member.monthlyIncomeCents / 100).toFixed(2).replace('.', ',')
                        : ''
                    }
                    placeholder="5.000,00"
                  />
                </Field>

                <ColorPicker name="color" defaultValue={member.color} />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setEditingId(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <SubmitButton className="flex-1" pendingLabel="Salvando…">
                    Salvar
                  </SubmitButton>
                </div>
              </form>
            </li>
          ) : (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-border p-4"
            >
              <Avatar name={member.displayName} color={member.color} size="md" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-fg">
                    {member.displayName}
                  </span>
                  {member.role === 'OWNER' && <Badge tone="brand">Administra</Badge>}
                  {member.isSelf && <Badge>Você</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {member.monthlyIncomeCents !== null ? (
                    <>
                      Renda:{' '}
                      <Money
                        cents={member.monthlyIncomeCents}
                        currency={currency}
                        tone="muted"
                        size="xs"
                      />
                    </>
                  ) : (
                    'Renda não informada'
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                {(member.isSelf || canManage) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${member.displayName}`}
                    onClick={() => setEditingId(member.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                )}

                {canManage && !member.isSelf && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${member.displayName}`}
                    onClick={() => setRemovingId(member.id)}
                    className="text-subtle hover:text-danger"
                  >
                    <UserMinus className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                )}
              </div>

              <ConfirmDialog
                open={removingId === member.id}
                title={`Remover ${member.displayName}?`}
                description="Os lançamentos feitos por essa pessoa continuam no histórico — só o acesso é revogado."
                error={removeState.error}
                onCancel={() => setRemovingId(null)}
              >
                <form action={removeAction}>
                  <input type="hidden" name="spaceId" value={spaceId} />
                  <input type="hidden" name="membershipId" value={member.id} />
                  <Button type="submit" variant="danger" className="w-full">
                    Remover do espaço
                  </Button>
                </form>
              </ConfirmDialog>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
