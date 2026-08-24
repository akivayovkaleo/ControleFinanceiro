'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal, Plus } from 'lucide-react';
import { visibleNavItems } from './nav-items';
import { cn } from '@/lib/utils';

/**
 * Barra inferior do celular.
 *
 * Só os destinos de uso diário cabem aqui; o resto vive atrás de "Mais". O
 * botão central de lançar é destacado porque registrar um gasto é a ação que
 * a pessoa faz na fila do mercado — precisa estar a um toque do polegar.
 *
 * `pb-[env(safe-area-inset-bottom)]` evita que a barra fique escondida atrás
 * do indicador de home do iPhone.
 */
export function MobileNav({
  activeSpaceId,
  isShared,
}: {
  activeSpaceId: string;
  isShared: boolean;
}) {
  const pathname = usePathname();
  const primary = visibleNavItems(isShared).filter((item) => item.primary).slice(0, 4);
  const withSpace = (href: string) => `${href}?space=${activeSpaceId}`;

  const left = primary.slice(0, 2);
  const right = primary.slice(2);

  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="flex items-stretch">
        {left.map((item) => (
          <NavTab key={item.href} item={item} pathname={pathname} href={withSpace(item.href)} />
        ))}

        <li className="flex flex-1 items-center justify-center">
          <Link
            href={withSpace('/lancamentos/novo')}
            aria-label="Novo lançamento"
            className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-pop transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </Link>
        </li>

        {right.map((item) => (
          <NavTab key={item.href} item={item} pathname={pathname} href={withSpace(item.href)} />
        ))}

        <NavTab
          item={{ href: '/mais', label: 'Mais', icon: MoreHorizontal }}
          pathname={pathname}
          href={withSpace('/mais')}
        />
      </ul>
    </nav>
  );
}

function NavTab({
  item,
  pathname,
  href,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  pathname: string;
  href: string;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-col items-center gap-0.5 px-1 py-2.5 text-2xs font-medium transition-colors',
          active ? 'text-brand' : 'text-muted',
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}
