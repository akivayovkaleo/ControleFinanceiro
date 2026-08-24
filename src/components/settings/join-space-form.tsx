'use client';

import { useActionState } from 'react';
import { joinSpaceAction } from '@/server/actions/spaces';
import { idleState } from '@/server/actions/types';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function JoinSpaceForm() {
  const [state, formAction] = useActionState(joinSpaceAction, idleState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Código do convite" htmlFor="invite-code" error={state.fieldErrors?.code} required>
        <Input
          id="invite-code"
          name="code"
          placeholder="ABCD-2345-EFGH"
          maxLength={20}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          className="tabular text-center text-lg font-semibold tracking-widest"
        />
      </Field>

      <SubmitButton pendingLabel="Entrando…">Entrar no espaço</SubmitButton>
    </form>
  );
}
