import { redirect } from 'next/navigation';
import { getCurrentUser, listUserSpaces } from '@/lib/auth/guard';
import { Sidebar } from '@/components/app/sidebar';
import { MobileNav } from '@/components/app/mobile-nav';
import { MobileHeader } from '@/components/app/mobile-header';
import { db } from '@/lib/db';

/**
 * Casca do app autenticado.
 *
 * Aqui só resolvemos o usuário e a lista de espaços — o espaço ATIVO é
 * resolvido por cada página via `getActiveSpace(searchParams)`, porque
 * layouts no App Router não recebem searchParams.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');

  const spaces = await listUserSpaces(user.id);
  if (spaces.length === 0) redirect('/comecar');

  // Mesma lógica de `resolveDefaultSpaceId`, mas sem redirecionar: o layout
  // só precisa de um id para montar os links de navegação.
  const activeSpaceId =
    (user.lastSpaceId && spaces.some((s) => s.spaceId === user.lastSpaceId)
      ? user.lastSpaceId
      : spaces[0]!.spaceId);

  const activeSpace = spaces.find((s) => s.spaceId === activeSpaceId)!;
  const isShared = activeSpace.type === 'SHARED' && activeSpace.memberCount > 1;

  // Gera lançamentos recorrentes vencidos de forma oportunista. É barato
  // (uma consulta indexada) e evita depender de cron num app self-hosted.
  await materializePendingRecurrences(activeSpaceId, user.id);

  const options = spaces.map((s) => ({
    spaceId: s.spaceId,
    name: s.name,
    type: s.type as 'PERSONAL' | 'SHARED',
    memberCount: s.memberCount,
  }));

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar
        spaces={options}
        activeSpaceId={activeSpaceId}
        isShared={isShared}
        user={{ name: user.name, email: user.email, avatarColor: user.avatarColor }}
      />
      <MobileHeader spaces={options} activeSpaceId={activeSpaceId} />

      <div className="lg:pl-64">
        {/* pb-24 no mobile reserva espaço para a barra inferior. */}
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>

      <MobileNav activeSpaceId={activeSpaceId} isShared={isShared} />
    </div>
  );
}

/**
 * Materialização oportunista das recorrências.
 *
 * Roda no layout para cobrir qualquer tela que a pessoa abra. Falhar aqui
 * nunca deve impedir o app de carregar — por isso o try/catch silencioso.
 */
async function materializePendingRecurrences(spaceId: string, userId: string): Promise<void> {
  try {
    const pending = await db.recurrence.count({
      where: { spaceId, active: true, nextRunAt: { lte: new Date() } },
    });
    if (pending === 0) return;

    const { requireSpace } = await import('@/lib/auth/guard');
    const { materializeRecurrences } = await import('@/server/actions/recurrences');
    const context = await requireSpace(spaceId);
    if (context.user.id !== userId) return;

    await materializeRecurrences(context);
  } catch (error) {
    console.error('[recorrencias] falha ao materializar:', error);
  }
}
