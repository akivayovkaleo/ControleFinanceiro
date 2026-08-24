import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { getCurrentUser, listUserSpaces } from '@/lib/auth/guard';
import { CreateSpaceForm } from '@/components/settings/create-space-form';
import { JoinSpaceForm } from '@/components/settings/join-space-form';
import { Card, CardBody, CardHeader } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Começar' };

/**
 * Rede de segurança: usuário autenticado sem nenhum espaço.
 *
 * Pelo fluxo normal isso não acontece — o cadastro já cria o espaço pessoal.
 * Mas se alguém sair do último espaço ou os dados forem migrados na mão, esta
 * tela dá uma saída em vez de um erro.
 */
export default async function StartPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');

  const spaces = await listUserSpaces(user.id);
  if (spaces.length > 0) redirect('/painel');

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-fg">
          <Wallet className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Vamos criar seu primeiro espaço
        </h1>
        <p className="mt-2 text-sm text-muted">
          Um espaço guarda contas, categorias e lançamentos. Você pode ter quantos quiser.
        </p>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="Criar um espaço" />
          <CardBody className="pt-3">
            <CreateSpaceForm />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ou entrar com um convite" />
          <CardBody className="pt-3">
            <JoinSpaceForm />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
