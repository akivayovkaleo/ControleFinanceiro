import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Castle,
  Handshake,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  Settings,
  Tags,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Só aparece em espaço com mais de uma pessoa. */
  sharedOnly?: boolean;
  /** Aparece na barra inferior do celular. */
  primary?: boolean;
}

/**
 * Navegação principal.
 *
 * A ordem segue a frequência de uso real: o painel e os lançamentos são o
 * dia a dia; configurações vão para o fim. "Acerto" só existe quando há
 * mais de uma pessoa no espaço — mostrá-lo vazio no modo solo seria ruído.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard, primary: true },
  { href: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight, primary: true },
  { href: '/orcamentos', label: 'Orçamentos', icon: PiggyBank, primary: true },
  { href: '/acerto', label: 'Acerto', icon: Handshake, sharedOnly: true, primary: true },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/investimentos', label: 'Investimentos', icon: TrendingUp },
  { href: '/vila', label: 'Vila', icon: Castle },
  { href: '/contas', label: 'Contas', icon: Wallet },
  { href: '/categorias', label: 'Categorias', icon: Tags },
  { href: '/recorrencias', label: 'Recorrências', icon: Repeat },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function visibleNavItems(isShared: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.sharedOnly || isShared);
}
