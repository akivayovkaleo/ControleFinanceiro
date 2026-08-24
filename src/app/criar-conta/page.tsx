import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignupForm } from '@/components/auth/signup-form';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'Criar conta' };

export default function SignupPage() {
  // Instância fechada: nem mostra o formulário.
  if (env().DISABLE_SIGNUP) redirect('/entrar');

  return (
    <AuthShell
      title="Comece agora"
      subtitle="Leva um minuto. Depois você decide se quer compartilhar com alguém."
      footer={
        <span>
          Já tem conta?{' '}
          <Link href="/entrar" className="font-medium text-brand hover:underline">
            Entrar
          </Link>
        </span>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
