/**
 * Guardas de autenticação e autorização.
 *
 * REGRA DE OURO DO PROJETO: nenhum dado financeiro é lido ou escrito sem
 * passar por `requireSpace()`. Ele responde a uma única pergunta —
 * "este usuário é membro deste space?" — e devolve o `membership`, que é o
 * que o resto do código usa para filtrar consultas.
 *
 * Consulta sem `spaceId` no `where` é bug de segurança, não detalhe de estilo.
 */

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { MemberRole, Space, User } from '@prisma/client';
import { db } from '@/lib/db';
import { AuthorizationError } from '@/lib/errors';
import { getCurrentSession } from './session';

export { AuthorizationError } from '@/lib/errors';

export type SessionUser = Pick<
  User,
  'id' | 'email' | 'name' | 'avatarColor' | 'theme' | 'lastSpaceId' | 'createdAt'
>;

/**
 * `cache` do React deduplica a chamada dentro de uma mesma requisição: o
 * layout, a página e cada Server Component podem chamar sem multiplicar
 * consultas ao banco.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getCurrentSession();
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarColor: true,
      theme: true,
      lastSpaceId: true,
      createdAt: true,
    },
  });
});

/** Exige usuário logado. Redireciona para o login se não houver. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  return user;
}

export interface SpaceContext {
  user: SessionUser;
  space: Space;
  membership: {
    id: string;
    role: MemberRole;
    displayName: string;
    color: string;
    monthlyIncomeCents: number | null;
  };
  /** Todos os membros do space, ordenados de forma estável. */
  members: Array<{
    id: string;
    userId: string;
    role: MemberRole;
    displayName: string;
    color: string;
    monthlyIncomeCents: number | null;
  }>;
  isShared: boolean;
}

/**
 * Carrega o space e confirma que o usuário é membro.
 *
 * @throws AuthorizationError se não for membro (ou se o space não existir —
 *         de propósito: a mesma mensagem evita revelar que o id existe).
 */
export const requireSpace = cache(async (spaceId: string): Promise<SpaceContext> => {
  const user = await requireUser();

  const membership = await db.membership.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId } },
    include: { space: true },
  });

  if (!membership) throw new AuthorizationError();

  const members = await db.membership.findMany({
    where: { spaceId },
    select: {
      id: true,
      userId: true,
      role: true,
      displayName: true,
      color: true,
      monthlyIncomeCents: true,
    },
    orderBy: { id: 'asc' },
  });

  return {
    user,
    space: membership.space,
    membership: {
      id: membership.id,
      role: membership.role,
      displayName: membership.displayName,
      color: membership.color,
      monthlyIncomeCents: membership.monthlyIncomeCents,
    },
    members,
    isShared: membership.space.type === 'SHARED' && members.length > 1,
  };
});

/** Exige papel de OWNER — gerenciar membros, convites, apagar o space. */
export async function requireSpaceOwner(spaceId: string): Promise<SpaceContext> {
  const context = await requireSpace(spaceId);
  if (context.membership.role !== 'OWNER') {
    throw new AuthorizationError('Só quem administra este espaço pode fazer isso.');
  }
  return context;
}

/** Spaces do usuário, para o seletor do topo. */
export const listUserSpaces = cache(async (userId: string) => {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: {
      space: {
        include: { _count: { select: { memberships: true } } },
      },
    },
    orderBy: [{ space: { type: 'asc' } }, { joinedAt: 'asc' }],
  });

  return memberships.map((m) => ({
    spaceId: m.spaceId,
    name: m.space.name,
    type: m.space.type,
    currency: m.space.currency,
    role: m.role,
    memberCount: m.space._count.memberships,
  }));
});

/**
 * Resolve qual space usar quando a URL não diz: o último usado, ou o pessoal.
 * Se o usuário não tem nenhum (estado impossível pelo fluxo normal), manda
 * para o onboarding em vez de estourar.
 */
export async function resolveDefaultSpaceId(user: SessionUser): Promise<string> {
  if (user.lastSpaceId) {
    const still = await db.membership.findUnique({
      where: { userId_spaceId: { userId: user.id, spaceId: user.lastSpaceId } },
      select: { spaceId: true },
    });
    if (still) return still.spaceId;
  }

  const fallback = await db.membership.findFirst({
    where: { userId: user.id },
    orderBy: [{ space: { type: 'asc' } }, { joinedAt: 'asc' }],
    select: { spaceId: true },
  });

  if (!fallback) redirect('/comecar');
  return fallback.spaceId;
}

/** IP do cliente, para rate limiting e auditoria. Só o hash é persistido. */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return h.get('x-real-ip') ?? null;
}

export async function getUserAgent(): Promise<string | null> {
  const h = await headers();
  return h.get('user-agent');
}
