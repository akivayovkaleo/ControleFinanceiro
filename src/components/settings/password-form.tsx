'use client';

import { useActionState } from 'react';
import { changePasswordAction } from '@/server/actions/auth';
import { idleState } from '@/server/actions/types';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function PasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, idleState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <Field
        label="Senha atual"
        htmlFor="current-password"
        error={state.fieldErrors?.currentPassword}
        required
      >
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="Nova senha"
        htmlFor="new-password"
        error={state.fieldErrors?.newPassword}
        hint="Pelo menos 10 caracteres."
        required
      >
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <Field
        label="Repita a nova senha"
        htmlFor="new-password-confirm"
        error={state.fieldErrors?.newPasswordConfirm}
        required
      >
        <Input
          id="new-password-confirm"
          name="newPasswordConfirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton pendingLabel="Alterando…">Alterar senha</SubmitButton>
    </form>
  );
}
