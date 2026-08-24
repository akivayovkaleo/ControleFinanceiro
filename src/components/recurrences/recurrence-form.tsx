'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { saveRecurrenceAction } from '@/server/actions/recurrences';
import { idleState } from '@/server/actions/types';
import { FREQUENCY_LABELS, toDateInput, todayUtc } from '@/lib/date';
import { SPLIT_MODE_LABELS, type SplitMode } from '@/lib/split';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input, Select } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export function RecurrenceForm({
  spaceId,
  accounts,
  categories,
  members,
  isShared,
}: {
  spaceId: string;
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; kind: string }>;
  members: Array<{ id: string; displayName: string }>;
  isShared: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [state, formAction] = useActionState(saveRecurrenceAction, idleState);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Nova recorrência
      </Button>
    );
  }

  const visibleCategories = categories.filter((c) => c.kind === type);

  return (
    <Card className="mb-5">
      <CardBody>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="active" value="on" />

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" htmlFor="rec-type">
              <Select
                id="rec-type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')}
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </Select>
            </Field>

            <Field
              label="Valor"
              htmlFor="rec-amount"
              error={state.fieldErrors?.amountCents}
              required
            >
              <Input
                id="rec-amount"
                name="amountCents"
                inputMode="decimal"
                placeholder="1.500,00"
                required
              />
            </Field>
          </div>

          <Field
            label="Descrição"
            htmlFor="rec-description"
            error={state.fieldErrors?.description}
            required
          >
            <Input
              id="rec-description"
              name="description"
              placeholder={type === 'INCOME' ? 'Salário' : 'Aluguel'}
              maxLength={120}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Conta" htmlFor="rec-account" error={state.fieldErrors?.accountId} required>
              <Select id="rec-account" name="accountId" required>
                <option value="">Selecione…</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Categoria" htmlFor="rec-category">
              <Select id="rec-category" name="categoryId">
                <option value="">Sem categoria</option>
                {visibleCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Frequência" htmlFor="rec-frequency">
              <Select id="rec-frequency" name="frequency" defaultValue="MONTHLY">
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Primeira ocorrência"
              htmlFor="rec-next"
              error={state.fieldErrors?.nextRunAt}
              required
            >
              <Input
                id="rec-next"
                name="nextRunAt"
                type="date"
                defaultValue={toDateInput(todayUtc())}
                required
              />
            </Field>

            <Field label="Até quando" htmlFor="rec-ends" hint="Opcional">
              <Input id="rec-ends" name="endsAt" type="date" />
            </Field>
          </div>

          {isShared && type === 'EXPENSE' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quem paga" htmlFor="rec-paid-by">
                <Select id="rec-paid-by" name="paidByMembershipId">
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Como dividir" htmlFor="rec-split">
                <Select id="rec-split" name="splitMode" defaultValue="EQUAL">
                  {(Object.keys(SPLIT_MODE_LABELS) as SplitMode[])
                    .filter((mode) => mode !== 'CUSTOM')
                    .map((mode) => (
                      <option key={mode} value={mode}>
                        {SPLIT_MODE_LABELS[mode]}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <SubmitButton className="flex-1" pendingLabel="Criando…">
              Criar recorrência
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
