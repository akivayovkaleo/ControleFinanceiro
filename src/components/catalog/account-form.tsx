'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { saveAccountAction } from '@/server/actions/catalog';
import { idleState } from '@/server/actions/types';
import { ACCOUNT_TYPE_LABELS } from '@/lib/presets';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input, Select } from '@/components/ui/field';
import { ColorPicker } from '@/components/ui/color-picker';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export interface AccountFormValues {
  id: string;
  name: string;
  type: string;
  openingBalance: string;
  ownerMembershipId: string;
  creditLimit: string;
  statementDay: string;
  dueDay: string;
  color: string;
}

export function AccountForm({
  spaceId,
  members,
  initial,
  onDone,
}: {
  spaceId: string;
  members: Array<{ id: string; displayName: string }>;
  initial?: Partial<AccountFormValues>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(initial?.id));
  const [type, setType] = useState(initial?.type ?? 'CHECKING');
  const [state, formAction] = useActionState(saveAccountAction, idleState);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      onDone?.();
      router.refresh();
    }
  }, [state.ok, router, onDone]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Nova conta
      </Button>
    );
  }

  return (
    <Card className="mb-5">
      <CardBody>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="spaceId" value={spaceId} />
          {initial?.id && <input type="hidden" name="accountId" value={initial.id} />}

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="account-name" error={state.fieldErrors?.name} required>
              <Input
                id="account-name"
                name="name"
                defaultValue={initial?.name}
                placeholder="Conta do Nubank"
                maxLength={60}
                autoFocus
                required
              />
            </Field>

            <Field label="Tipo" htmlFor="account-type" error={state.fieldErrors?.type}>
              <Select
                id="account-type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Saldo inicial"
              htmlFor="account-opening"
              error={state.fieldErrors?.openingBalanceCents}
              hint="Quanto havia nesta conta quando você começou a controlar aqui."
            >
              <Input
                id="account-opening"
                name="openingBalanceCents"
                inputMode="decimal"
                defaultValue={initial?.openingBalance}
                placeholder="0,00"
              />
            </Field>

            {members.length > 1 && (
              <Field
                label="De quem é esta conta"
                htmlFor="account-owner"
                hint="Deixe em branco se for uma conta conjunta."
              >
                <Select
                  id="account-owner"
                  name="ownerMembershipId"
                  defaultValue={initial?.ownerMembershipId}
                >
                  <option value="">Conta conjunta</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          {type === 'CREDIT_CARD' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Limite"
                htmlFor="account-limit"
                error={state.fieldErrors?.creditLimitCents}
              >
                <Input
                  id="account-limit"
                  name="creditLimitCents"
                  inputMode="decimal"
                  defaultValue={initial?.creditLimit}
                  placeholder="5.000,00"
                />
              </Field>
              <Field label="Fecha dia" htmlFor="account-statement">
                <Input
                  id="account-statement"
                  name="statementDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={initial?.statementDay}
                  placeholder="20"
                />
              </Field>
              <Field label="Vence dia" htmlFor="account-due">
                <Input
                  id="account-due"
                  name="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={initial?.dueDay}
                  placeholder="28"
                />
              </Field>
            </div>
          )}

          <ColorPicker name="color" defaultValue={initial?.color} />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                onDone?.();
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <SubmitButton className="flex-1" pendingLabel="Salvando…">
              {initial?.id ? 'Salvar' : 'Criar conta'}
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
