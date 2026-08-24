import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Check, User, Users } from 'lucide-react';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { listUserSpaces } from '@/lib/auth/guard';
import { PageHeader } from '@/components/app/page-header';
import { CreateSpaceForm } from '@/components/settings/create-space-form';
import { JoinSpaceForm } from '@/components/settings/join-space-form';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Espaços' };

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { user, space } = context;

  const spaces = await listUserSpaces(user.id);

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
        title="Espaços"
        description="Cada espaço é um conjunto separado de contas, categorias e lançamentos."
      />

      <div className="space-y-5">
        <Card>
          <CardHeader title="Seus espaços" />
          <CardBody className="pt-3">
            <ul className="space-y-2">
              {spaces.map((item) => (
                <li key={item.spaceId}>
                  <Link
                    href={{ pathname: '/painel', query: { space: item.spaceId } }}
                    className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span
                      className={
                        item.type === 'SHARED'
                          ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand'
                          : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted'
                      }
                    >
                      {item.type === 'SHARED' ? (
                        <Users className="h-4 w-4" aria-hidden />
                      ) : (
                        <User className="h-4 w-4" aria-hidden />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-fg">{item.name}</span>
                        {item.role === 'OWNER' && <Badge tone="brand">Administra</Badge>}
                      </span>
                      <span className="block text-xs text-muted">
                        {item.type === 'SHARED'
                          ? `${item.memberCount} ${item.memberCount === 1 ? 'pessoa' : 'pessoas'}`
                          : 'Só você'}
                      </span>
                    </span>

                    {item.spaceId === space.id && (
                      <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Criar um espaço compartilhado"
            description="É aqui que as contas do casal ficam. Depois de criar, gere um convite."
          />
          <CardBody className="pt-3">
            <CreateSpaceForm />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Entrar com um convite"
            description="Recebeu um código de 12 caracteres? Cole aqui."
          />
          <CardBody className="pt-3">
            <JoinSpaceForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
