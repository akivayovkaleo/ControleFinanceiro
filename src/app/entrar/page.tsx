import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const params = await searchParams;
  const signupDisabled = env().DISABLE_SIGNUP;

  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Entre para ver como andam as contas."
      footer={
        signupDisabled ? (
          <span>Novos cadastros estão desativados nesta instalação.</span>
        ) : (
          <span>
            Ainda não tem conta?{' '}
            <Link href="/criar-conta" className="font-medium text-brand hover:underline">
              Criar conta
            </Link>
          </span>
        )
      }
    >
      <LoginForm nextPath={params.proximo} />
    </AuthShell>
  );
}
