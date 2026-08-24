'use client';

import { useActionState } from 'react';
import { updateSpaceAction } from '@/server/actions/spaces';
import { idleState } from '@/server/actions/types';
import { CURRENCY_LABELS } from '@/lib/presets';
import { Field, Input, Select } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function SpaceForm({
  spaceId,
  name,
  currency,
  monthStartDay,
}: {
  spaceId: string;
  name: string;
  currency: string;
  monthStartDay: number;
}) {
  const [state, formAction] = useActionState(updateSpaceAction, idleState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="spaceId" value={spaceId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <Field label="Nome do espaço" htmlFor="space-name" error={state.fieldErrors?.name} required>
        <Input id="space-name" name="name" defaultValue={name} maxLength={60} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Moeda" htmlFor="space-currency">
          <Select id="space-currency" name="currency" defaultValue={currency}>
            {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="O mês começa no dia"
          htmlFor="space-month-start"
          hint="Use 1 para o mês normal, ou o dia do salário se preferir organizar por aí."
        >
          <Input
            id="space-month-start"
            name="monthStartDay"
            type="number"
            min={1}
            max={28}
            defaultValue={monthStartDay}
          />
        </Field>
      </div>

      <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
    </form>
  );
}
