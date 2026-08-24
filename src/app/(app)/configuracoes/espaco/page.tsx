import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { PageHeader } from '@/components/app/page-header';
import { SpaceForm } from '@/components/settings/space-form';
import { MemberList, type MemberRow } from '@/components/settings/member-list';
import { InvitePanel } from '@/components/settings/invite-panel';
import { LeaveSpace } from '@/components/settings/leave-space';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = { title: 'Espaço' };

export default async function SpaceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space, members, membership } = context;

  const isOwner = membership.role === 'OWNER';
  const isPersonal = space.type === 'PERSONAL';

  const invites = isPersonal
    ? []
    : await db.invite.findMany({
        where: { spaceId: space.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          codeHint: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      });

  const memberRows: MemberRow[] = members.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    color: m.color,
    role: m.role,
    monthlyIncomeCents: m.monthlyIncomeCents,
    isSelf: m.id === membership.id,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={{ pathname: '/configuracoes', query: { space: space.id } }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Configurações
      </Link>

      <PageHeader
        title={space.name}
        description={isPersonal ? 'Seu espaço pessoal — só você vê o que há aqui.' : 'Espaço compartilhado'}
      />

      <div className="space-y-5">
        <Card>
          <CardHeader title="Preferências do espaço" />
          <CardBody className="pt-3">
            {isOwner ? (
              <SpaceForm
                spaceId={space.id}
                name={space.name}
                currency={space.currency}
                monthStartDay={space.monthStartDay}
              />
            ) : (
              <p className="text-sm text-muted">
                Só quem administra este espaço pode alterar essas preferências.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Pessoas"
            description={
              isPersonal
                ? 'O espaço pessoal é sempre de uma pessoa só.'
                : `${members.length} ${members.length === 1 ? 'pessoa' : 'pessoas'} neste espaço`
            }
          />
          <CardBody className="pt-3">
            <MemberList
              spaceId={space.id}
              members={memberRows}
              currency={space.currency}
              canManage={isOwner && !isPersonal}
            />
          </CardBody>
        </Card>

        {!isPersonal && isOwner && (
          <Card>
            <CardHeader
              title="Convidar alguém"
              description="Gere um código e mande para a pessoa. Ela cria a conta dela e entra com ele."
            />
            <CardBody className="pt-3">
              <InvitePanel spaceId={space.id} invites={invites} />
            </CardBody>
          </Card>
        )}

        {isPersonal && (
          <Alert tone="info">
            <p className="font-semibold">Quer dividir contas com alguém?</p>
            <p className="mt-1 font-normal">
              Este espaço é privado e continua assim. Crie um espaço compartilhado à parte —
              os dois convivem, e você decide em qual lançar cada coisa.{' '}
              <Link
                href={{ pathname: '/configuracoes/espacos', query: { space: space.id } }}
                className="font-semibold underline"
              >
                Criar espaço compartilhado
              </Link>
            </p>
          </Alert>
        )}

        {!isPersonal && (
          <Card>
            <CardHeader
              title="Sair deste espaço"
              description="Você perde o acesso, mas os lançamentos ficam para quem continuar."
            />
            <CardBody className="pt-3">
              <LeaveSpace spaceId={space.id} spaceName={space.name} />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
