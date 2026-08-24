'use client';

import { useActionState, useState } from 'react';
import { signupAction } from '@/server/actions/auth';
import { idleState } from '@/server/actions/types';
import { evaluatePasswordStrength } from '@/lib/auth/password-policy';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * O medidor de força é apenas orientação: ele reflete a mesma heurística de
 * `evaluatePasswordStrength`, mas quem aceita ou recusa a senha é o schema no
 * servidor. Nunca confie em validação de cliente.
 */
function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const { score, label, issues } = evaluatePasswordStrength(password);
  const COLORS = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-brand', 'bg-income'];

  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < score ? COLORS[score] : 'bg-surface-2',
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Senha <span className="font-medium text-fg">{label}</span>
        {issues.length > 0 && ` — ${issues[0]}`}
      </p>
    </div>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, idleState);
  const [password, setPassword] = useState('');

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Como você se chama" htmlFor="name" error={state.fieldErrors?.name} required>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Seu nome"
          required
          autoFocus
          error={Boolean(state.fieldErrors?.name)}
        />
      </Field>

      <Field label="E-mail" htmlFor="email" error={state.fieldErrors?.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          required
          error={Boolean(state.fieldErrors?.email)}
        />
      </Field>

      <Field
        label="Senha"
        htmlFor="password"
        error={state.fieldErrors?.password}
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Pelo menos 10 caracteres"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={Boolean(state.fieldErrors?.password)}
        />
        <StrengthMeter password={password} />
      </Field>

      <Field
        label="Repita a senha"
        htmlFor="passwordConfirm"
        error={state.fieldErrors?.passwordConfirm}
        required
      >
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          required
          error={Boolean(state.fieldErrors?.passwordConfirm)}
        />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel="Criando sua conta…">
        Criar conta
      </SubmitButton>

      <p className="text-xs leading-relaxed text-muted">
        Seus dados ficam no banco desta instalação. Não há rastreadores, anúncios
        nem envio de informação para terceiros.
      </p>
    </form>
  );
}
