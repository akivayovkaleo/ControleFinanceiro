import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, LogOut, Shield, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { logoutAction } from '@/server/actions/auth';
import { PageHeader } from '@/components/app/page-header';
import { ProfileForm } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { SessionsPanel } from '@/components/settings/sessions-panel';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Configurações' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { user, space } = context;

  const sessions = await db.session.findMany({
    where: { userId: user.id },
    orderBy: { lastSeenAt: 'desc' },
    select: { id: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true },
  });

  return (
    <>
      <PageHeader title="Configurações" description="Sua conta e este espaço." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Seu perfil" description="Como você aparece no app." />
          <CardBody className="pt-3">
            <ProfileForm name={user.name} email={user.email} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Este espaço"
            description="Nome, moeda, membros e convites."
          />
          <CardBody className="space-y-2 pt-3">
            <Link
              href={{ pathname: '/configuracoes/espaco', query: { space: space.id } }}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-surface-2"
            >
              <Users className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">{space.name}</span>
                <span className="block text-xs text-muted">
                  {space.type === 'SHARED' ? 'Espaço compartilhado' : 'Espaço pessoal'}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
            </Link>

            <Link
              href={{ pathname: '/configuracoes/espacos', query: { space: space.id } }}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-surface-2"
            >
              <Users className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">Todos os espaços</span>
                <span className="block text-xs text-muted">
                  Criar um espaço novo ou entrar com um convite
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Senha"
            description="Trocar a senha encerra as sessões nos outros aparelhos."
          />
          <CardBody className="pt-3">
            <PasswordForm />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Sessões ativas"
            description="Onde sua conta está conectada agora."
            action={<Shield className="h-4 w-4 text-muted" aria-hidden />}
          />
          <CardBody className="pt-3">
            <SessionsPanel sessions={sessions} />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-fg">Sair da conta</p>
            <p className="text-xs text-muted">Encerra a sessão deste aparelho.</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              <LogOut className="h-4 w-4" aria-hidden />
              Sair
            </Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
