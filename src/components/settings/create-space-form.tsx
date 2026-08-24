'use client';

import { useActionState } from 'react';
import { createSpaceAction } from '@/server/actions/spaces';
import { idleState } from '@/server/actions/types';
import { CURRENCY_LABELS } from '@/lib/presets';
import { Field, Input, Select } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function CreateSpaceForm() {
  const [state, formAction] = useActionState(createSpaceAction, idleState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field
        label="Nome do espaço"
        htmlFor="new-space-name"
        error={state.fieldErrors?.name}
        hint="Um nome que faça sentido para vocês dois."
        required
      >
        <Input
          id="new-space-name"
          name="name"
          placeholder="Nossa casa"
          maxLength={60}
          required
        />
      </Field>

      <Field label="Moeda" htmlFor="new-space-currency">
        <Select id="new-space-currency" name="currency" defaultValue="BRL">
          {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton pendingLabel="Criando…">Criar espaço</SubmitButton>
    </form>
  );
}
