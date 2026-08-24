import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, LogOut } from 'lucide-react';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { logoutAction } from '@/server/actions/auth';
import { visibleNavItems } from '@/components/app/nav-items';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

export const metadata: Metadata = { title: 'Mais' };

/**
 * Menu "Mais" do celular.
 *
 * A barra inferior só comporta quatro destinos; tudo o que não coube fica
 * aqui, numa lista tocável. No desktop essa tela é redundante com a barra
 * lateral, mas continua acessível — não custa nada e evita link quebrado.
 */
export default async function MorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { user, space, isShared } = context;

  const primaryHrefs = new Set(
    visibleNavItems(isShared).filter((i) => i.primary).map((i) => i.href),
  );
  const rest = visibleNavItems(isShared).filter((item) => !primaryHrefs.has(item.href));

  return (
    <>
      <PageHeader title="Mais" />

      <Card className="mb-4">
        <CardBody className="flex items-center gap-3">
          <Avatar name={user.name} color={user.avatarColor} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-1 p-2">
          {rest.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={{ pathname: href, query: { space: space.id } }}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="flex-1 text-sm font-medium text-fg">{label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
            </Link>
          ))}
        </CardBody>
      </Card>

      <form action={logoutAction} className="mt-4">
        <Button type="submit" variant="outline" className="w-full text-danger">
          <LogOut className="h-4 w-4" aria-hidden />
          Sair da conta
        </Button>
      </form>
    </>
  );
}
