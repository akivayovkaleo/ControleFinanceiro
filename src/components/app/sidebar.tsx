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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[16.5rem] flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem] bg-brand text-brand-fg shadow-brand">
          <Wallet className="h-[1.05rem] w-[1.05rem]" aria-hidden />
        </span>
        <span className="text-[0.9375rem] font-semibold tracking-tight text-fg">Controle Financeiro</span>
      </div>

      <div className="px-3 pb-3">
        <SpaceSwitcher spaces={spaces} activeSpaceId={activeSpaceId} />
      </div>

      <div className="px-3 pb-3 pt-1">
        <Link
          href={withSpace('/lancamentos/novo')}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-medium text-brand-fg shadow-brand transition-all duration-150 hover:bg-brand-strong active:scale-[0.985]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo lançamento
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Navegação principal">
        <ul className="space-y-px">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={withSpace(href)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-colors duration-150',
                    active
                      ? 'bg-brand-soft text-brand'
                      : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {/* Barra à esquerda no item ativo: um segundo sinal além da
                      cor, que sobrevive a qualquer forma de daltonismo. */}
                  {active && (
                    <span
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                      aria-hidden
                    />
                  )}
                  <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" aria-hidden />
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
