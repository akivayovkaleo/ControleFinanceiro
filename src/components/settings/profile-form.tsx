'use client';

import { useActionState } from 'react';
import { updateProfileAction } from '@/server/actions/auth';
import { idleState } from '@/server/actions/types';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction] = useActionState(updateProfileAction, idleState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <Field label="Nome" htmlFor="profile-name" error={state.fieldErrors?.name} required>
        <Input id="profile-name" name="name" defaultValue={name} maxLength={80} required />
      </Field>

      <Field
        label="E-mail"
        htmlFor="profile-email"
        hint="O e-mail é o seu login e não pode ser alterado por aqui."
      >
        <Input id="profile-email" value={email} disabled readOnly />
      </Field>

      <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
    </form>
  );
}
