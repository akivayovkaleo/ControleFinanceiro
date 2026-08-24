import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guard';

/**
 * Raiz.
 *
 * Não há página de marketing: este app é instalado por quem já decidiu usá-lo.
 * Quem chega aqui ou está logado (vai para o painel) ou não está (vai para o
 * login). O middleware já cobre o caso comum; isto é a rede de segurança.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? '/painel' : '/entrar');
}
