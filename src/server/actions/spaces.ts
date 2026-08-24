'use server';

/**
 * Espaços compartilhados — o mecanismo que permite usar o app a dois.
 *
 * Fluxo do convite:
 *   1. Quem administra gera um código (aparece uma única vez na tela).
 *   2. Manda por WhatsApp, fala em voz alta, tanto faz.
 *   3. A outra pessoa cria a conta dela e digita o código.
 *   4. Vira `Membership` do mesmo space e passa a ver os mesmos dados.
 *
 * Cada pessoa continua com o SEU espaço pessoal, separado e invisível para o
 * outro. Compartilhar é uma escolha por espaço, não pela conta inteira.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '@/lib/presets';
import {
  formatInviteCode,
  generateInviteCode,
  hashInviteCode,
  inviteCodeHint,
  isValidInviteCodeFormat,
} from '@/lib/invite-code';
import { getClientIp, requireSpace, requireSpaceOwner, requireUser } from '@/lib/auth/guard';
import {
  createSpaceSchema,
  joinSpaceSchema,
  updateMemberSchema,
  updateSpaceSchema,
} from '@/lib/validation/finance';
import { KnownError, failure, parseForm, runAction, success, type ActionState } from './result';

/** Convites valem 7 dias — tempo de sobra para combinar, curto para vazar. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MEMBERS = 8;

export async function createSpaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = parseForm(createSpaceSchema, formData);
    if (!parsed.ok) return parsed.state;

    const count = await db.membership.count({ where: { userId: user.id } });
    if (count >= 20) {
      throw new KnownError('Você já participa de espaços demais.');
    }

    const space = await db.$transaction(async (tx) => {
      const created = await tx.space.create({
        data: { name: parsed.data.name, type: 'SHARED', currency: parsed.data.currency },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          spaceId: created.id,
          role: 'OWNER',
          displayName: user.name,
          color: user.avatarColor,
        },
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((c, index) => ({
          spaceId: created.id,
          name: c.name,
          kind: c.kind,
          color: c.color,
          icon: c.icon,
          isDefault: true,
          sortOrder: index,
        })),
      });

      await tx.account.createMany({
        data: DEFAULT_ACCOUNTS.map((a, index) => ({
          spaceId: created.id,
          name: a.name,
          type: a.type,
          color: a.color,
          icon: a.icon,
          sortOrder: index,
        })),
      });

      await tx.user.update({ where: { id: user.id }, data: { lastSpaceId: created.id } });
      return created;
    });

    await audit({
      action: 'space.create',
      userId: user.id,
      spaceId: space.id,
      meta: { name: space.name },
      ip: await getClientIp(),
    });

    revalidatePath('/', 'layout');
    redirect(`/painel?space=${space.id}`);
  });
}

export async function updateSpaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(updateSpaceSchema, formData);
    if (!parsed.ok) return parsed.state;

    const context = await requireSpaceOwner(parsed.data.spaceId);

    await db.space.update({
      where: { id: parsed.data.spaceId },
      data: {
        name: parsed.data.name,
        currency: parsed.data.currency,
        monthStartDay: parsed.data.monthStartDay,
      },
    });

    await audit({
      action: 'space.update',
      userId: context.user.id,
      spaceId: parsed.data.spaceId,
      meta: { name: parsed.data.name },
    });

    revalidatePath('/', 'layout');
    return success('Espaço atualizado.');
  });
}

export async function createInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const context = await requireSpaceOwner(spaceId);

    if (context.space.type === 'PERSONAL') {
      throw new KnownError(
        'O espaço pessoal é só seu. Crie um espaço compartilhado para convidar alguém.',
      );
    }

    const memberCount = await db.membership.count({ where: { spaceId } });
    if (memberCount >= MAX_MEMBERS) {
      throw new KnownError(`Este espaço já tem o máximo de ${MAX_MEMBERS} pessoas.`);
    }

    const code = generateInviteCode();

    await db.invite.create({
      data: {
        spaceId,
        codeHash: hashInviteCode(code),
        codeHint: inviteCodeHint(code),
        createdById: context.user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    await audit({
      action: 'invite.create',
      userId: context.user.id,
      spaceId,
      ip: await getClientIp(),
    });

    revalidatePath('/configuracoes/espaco');
    // O código em claro só existe aqui: o banco guarda o hash. Se a pessoa
    // perder, gera outro.
    return success('Convite criado. Compartilhe o código abaixo.', {
      code: formatInviteCode(code),
    });
  });
}

export async function revokeInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const inviteId = String(formData.get('inviteId') ?? '');
    const context = await requireSpaceOwner(spaceId);

    // O `spaceId` no where impede cancelar convite de outro espaço.
    const result = await db.invite.updateMany({
      where: { id: inviteId, spaceId, acceptedAt: null },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) throw new KnownError('Convite não encontrado.');

    await audit({ action: 'invite.revoke', userId: context.user.id, spaceId });
    revalidatePath('/configuracoes/espaco');
    return success('Convite cancelado.');
  });
}

export async function joinSpaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = parseForm(joinSpaceSchema, formData);
    if (!parsed.ok) return parsed.state;

    const { code } = parsed.data;
    if (!isValidInviteCodeFormat(code)) {
      return failure('Código inválido.', { code: 'Confira o código e tente de novo' });
    }

    const invite = await db.invite.findUnique({
      where: { codeHash: hashInviteCode(code) },
      include: { space: true },
    });

    const invalid = () =>
      failure('Este convite não é válido.', { code: 'Convite inválido, expirado ou já usado' });

    if (!invite) return invalid();
    if (invite.revokedAt) return invalid();
    if (invite.acceptedAt) return invalid();
    if (invite.expiresAt.getTime() <= Date.now()) return invalid();

    const already = await db.membership.findUnique({
      where: { userId_spaceId: { userId: user.id, spaceId: invite.spaceId } },
      select: { id: true },
    });
    if (already) {
      throw new KnownError('Você já faz parte deste espaço.');
    }

    const memberCount = await db.membership.count({ where: { spaceId: invite.spaceId } });
    if (memberCount >= MAX_MEMBERS) {
      throw new KnownError('Este espaço já está cheio.');
    }

    await db.$transaction(async (tx) => {
      // Marcar o convite como usado dentro da transação e exigindo
      // `acceptedAt: null` fecha a corrida entre dois usos simultâneos.
      const claimed = await tx.invite.updateMany({
        where: { id: invite.id, acceptedAt: null, revokedAt: null },
        data: { acceptedAt: new Date(), acceptedById: user.id },
      });
      if (claimed.count === 0) throw new KnownError('Este convite acabou de ser usado.');

      await tx.membership.create({
        data: {
          userId: user.id,
          spaceId: invite.spaceId,
          role: 'MEMBER',
          displayName: user.name,
          color: user.avatarColor,
        },
      });

      await tx.user.update({ where: { id: user.id }, data: { lastSpaceId: invite.spaceId } });
    });

    await audit({
      action: 'invite.accept',
      userId: user.id,
      spaceId: invite.spaceId,
      ip: await getClientIp(),
    });
    await audit({ action: 'member.join', userId: user.id, spaceId: invite.spaceId });

    revalidatePath('/', 'layout');
    redirect(`/painel?space=${invite.spaceId}`);
  });
}

export async function updateMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(updateMemberSchema, formData);
    if (!parsed.ok) return parsed.state;

    const context = await requireSpace(parsed.data.spaceId);

    // Cada um edita o próprio cartão; quem administra pode editar qualquer um.
    const isSelf = context.membership.id === parsed.data.membershipId;
    if (!isSelf && context.membership.role !== 'OWNER') {
      throw new KnownError('Você só pode editar o seu próprio perfil neste espaço.');
    }

    const result = await db.membership.updateMany({
      where: { id: parsed.data.membershipId, spaceId: parsed.data.spaceId },
      data: {
        displayName: parsed.data.displayName,
        color: parsed.data.color,
        monthlyIncomeCents: parsed.data.monthlyIncomeCents,
      },
    });

    if (result.count === 0) throw new KnownError('Membro não encontrado.');

    await audit({
      action: 'member.update',
      userId: context.user.id,
      spaceId: parsed.data.spaceId,
      entityId: parsed.data.membershipId,
    });

    revalidatePath('/', 'layout');
    return success('Perfil atualizado neste espaço.');
  });
}

export async function removeMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const membershipId = String(formData.get('membershipId') ?? '');
    const context = await requireSpaceOwner(spaceId);

    if (context.membership.id === membershipId) {
      throw new KnownError('Você não pode remover a si mesmo. Use "sair do espaço".');
    }

    const target = await db.membership.findFirst({
      where: { id: membershipId, spaceId },
      select: { id: true, displayName: true },
    });
    if (!target) throw new KnownError('Membro não encontrado.');

    // Os lançamentos ficam: apagá-los reescreveria o histórico do casal.
    // As referências a esta membership viram null (onDelete: SetNull).
    await db.membership.delete({ where: { id: target.id } });

    await audit({
      action: 'member.remove',
      userId: context.user.id,
      spaceId,
      meta: { displayName: target.displayName },
    });

    revalidatePath('/', 'layout');
    return success(`${target.displayName} saiu do espaço. Os lançamentos foram mantidos.`);
  });
}

export async function leaveSpaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const context = await requireSpace(spaceId);

    if (context.space.type === 'PERSONAL') {
      throw new KnownError('Você não pode sair do seu espaço pessoal.');
    }

    const owners = await db.membership.count({ where: { spaceId, role: 'OWNER' } });
    if (context.membership.role === 'OWNER' && owners <= 1) {
      throw new KnownError(
        'Você é a única pessoa que administra este espaço. Promova alguém antes de sair.',
      );
    }

    await db.membership.delete({ where: { id: context.membership.id } });
    await audit({ action: 'member.leave', userId: context.user.id, spaceId });

    revalidatePath('/', 'layout');
    redirect('/painel');
  });
}

/** Troca o espaço ativo. Guardado no usuário para persistir entre sessões. */
export async function switchSpaceAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const spaceId = String(formData.get('spaceId') ?? '');

  const membership = await db.membership.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId } },
    select: { spaceId: true },
  });
  if (!membership) redirect('/painel');

  await db.user.update({ where: { id: user.id }, data: { lastSpaceId: spaceId } });
  revalidatePath('/', 'layout');
  redirect(`/painel?space=${spaceId}`);
}
