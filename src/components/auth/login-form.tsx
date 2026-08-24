'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/server/actions/auth';
import { idleState } from '@/server/actions/types';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction] = useActionState(loginAction, idleState);

  // O React limpa o formulário depois da action; sem isto, errar a senha
  // apagaria também o e-mail já digitado. A `key` força o input a assumir o
  // novo defaultValue quando o estado muda.
  const lastEmail = typeof state.data?.email === 'string' ? state.data.email : '';

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {nextPath && <input type="hidden" name="proximo" value={nextPath} />}

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="E-mail" htmlFor="email" error={state.fieldErrors?.email} required>
        <Input
          key={lastEmail}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          defaultValue={lastEmail}
          required
          autoFocus={!lastEmail}
          error={Boolean(state.fieldErrors?.email)}
        />
      </Field>

      <Field label="Senha" htmlFor="password" error={state.fieldErrors?.password} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          required
          autoFocus={Boolean(lastEmail)}
          error={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>

      <p className="text-center text-xs text-muted">
        Esqueceu a senha?{' '}
        <Link href="/ajuda/senha" className="font-medium text-brand hover:underline">
          Veja como recuperar
        </Link>
      </p>
    </form>
  );
}
