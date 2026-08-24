'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Plus, Wallet } from 'lucide-react';
import { logoutAction } from '@/server/actions/auth';
import { visibleNavItems } from './nav-items';
import { SpaceSwitcher, type SpaceOption } from './space-switcher';
import { ThemeToggle } from './theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function Sidebar({
  spaces,
  activeSpaceId,
  isShared,
  user,
}: {
  spaces: SpaceOption[];
  activeSpaceId: string;
  isShared: boolean;
  user: { name: string; email: string; avatarColor: string };
}) {
  const pathname = usePathname();
  const items = visibleNavItems(isShared);
  const withSpace = (href: string) => `${href}?space=${activeSpaceId}`;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
          <Wallet className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-semibold tracking-tight text-fg">Controle Financeiro</span>
      </div>

      <div className="px-3 pb-3">
        <SpaceSwitcher spaces={spaces} activeSpaceId={activeSpaceId} />
      </div>

      <div className="px-3 pb-2">
        <Link
          href={withSpace('/lancamentos/novo')}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-medium text-brand-fg shadow-sm transition-colors hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo lançamento
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Navegação principal">
        <ul className="space-y-0.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={withSpace(href)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand-soft text-brand'
                      : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <ThemeToggle />
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-danger-soft hover:text-danger"
              aria-label="Sair da conta"
              title="Sair"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>

        <Link
          href={withSpace('/configuracoes')}
          className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
        >
          <Avatar name={user.name} color={user.avatarColor} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-fg">{user.name}</span>
            <span className="block truncate text-2xs text-muted">{user.email}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
