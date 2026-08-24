'use server';

/**
 * Contas e categorias — o "catálogo" do espaço.
 *
 * Regra de exclusão: nada que já tem lançamento é apagado de verdade. Apagar
 * uma conta com histórico deixaria o extrato inconsistente, então oferecemos
 * arquivamento (some da UI, o histórico continua). Só o que nunca foi usado
 * pode ser removido.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { requireSpace } from '@/lib/auth/guard';
import { accountSchema, categorySchema } from '@/lib/validation/finance';
import { KnownError, parseForm, runAction, success, type ActionState } from './result';

// ---------------------------------------------------------------- contas

export async function saveAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(accountSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    if (data.ownerMembershipId) {
      const belongs = context.members.some((m) => m.id === data.ownerMembershipId);
      if (!belongs) {
        throw new KnownError('Pessoa inválida para este espaço.', {
          ownerMembershipId: 'Pessoa inválida',
        });
      }
    }

    const payload = {
      spaceId: data.spaceId,
      name: data.name,
      type: data.type,
      openingBalanceCents: data.openingBalanceCents ?? 0,
      ownerMembershipId: data.ownerMembershipId,
      creditLimitCents: data.type === 'CREDIT_CARD' ? data.creditLimitCents : null,
      statementDay: data.type === 'CREDIT_CARD' ? (data.statementDay ?? null) : null,
      dueDay: data.type === 'CREDIT_CARD' ? (data.dueDay ?? null) : null,
      color: data.color,
      icon: data.icon,
    };

    let accountId = data.accountId;

    if (accountId) {
      const updated = await db.account.updateMany({
        where: { id: accountId, spaceId: data.spaceId },
        data: payload,
      });
      if (updated.count === 0) throw new KnownError('Conta não encontrada.');
    } else {
      const created = await db.account.create({ data: payload });
      accountId = created.id;
    }

    await audit({
      action: data.accountId ? 'account.update' : 'account.create',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'account',
      entityId: accountId,
      meta: { name: data.name },
    });

    revalidatePath('/contas');
    revalidatePath('/painel');
    revalidatePath('/lancamentos');
    return success(data.accountId ? 'Conta atualizada.' : 'Conta criada.', { accountId });
  });
}

export async function toggleAccountArchiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const accountId = String(formData.get('accountId') ?? '');
    const context = await requireSpace(spaceId);

    const account = await db.account.findFirst({
      where: { id: accountId, spaceId },
      select: { id: true, name: true, archived: true },
    });
    if (!account) throw new KnownError('Conta não encontrada.');

    await db.account.update({
      where: { id: account.id },
      data: { archived: !account.archived },
    });

    await audit({
      action: 'account.archive',
      userId: context.user.id,
      spaceId,
      entity: 'account',
      entityId: account.id,
      meta: { archived: !account.archived },
    });

    revalidatePath('/contas');
    revalidatePath('/painel');
    return success(account.archived ? 'Conta reativada.' : 'Conta arquivada.');
  });
}

export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const accountId = String(formData.get('accountId') ?? '');
    const context = await requireSpace(spaceId);

    const account = await db.account.findFirst({
      where: { id: accountId, spaceId },
      select: { id: true, name: true },
    });
    if (!account) throw new KnownError('Conta não encontrada.');

    const used = await db.transaction.count({
      where: { spaceId, OR: [{ accountId }, { toAccountId: accountId }] },
    });
    if (used > 0) {
      throw new KnownError(
        `Esta conta tem ${used} lançamento${used > 1 ? 's' : ''}. Arquive em vez de excluir — assim o histórico continua correto.`,
      );
    }

    await db.account.delete({ where: { id: account.id } });
    await audit({
      action: 'account.delete',
      userId: context.user.id,
      spaceId,
      entity: 'account',
      entityId: account.id,
      meta: { name: account.name },
    });

    revalidatePath('/contas');
    return success('Conta excluída.');
  });
}

// ------------------------------------------------------------ categorias

export async function saveCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(categorySchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const duplicate = await db.category.findFirst({
      where: {
        spaceId: data.spaceId,
        name: data.name,
        kind: data.kind,
        ...(data.categoryId ? { NOT: { id: data.categoryId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new KnownError('Já existe uma categoria com esse nome.', {
        name: 'Nome já usado',
      });
    }

    const payload = {
      spaceId: data.spaceId,
      name: data.name,
      kind: data.kind,
      color: data.color,
      icon: data.icon,
    };

    let categoryId = data.categoryId;

    if (categoryId) {
      const updated = await db.category.updateMany({
        where: { id: categoryId, spaceId: data.spaceId },
        data: { name: payload.name, color: payload.color, icon: payload.icon },
      });
      if (updated.count === 0) throw new KnownError('Categoria não encontrada.');
    } else {
      const created = await db.category.create({ data: payload });
      categoryId = created.id;
    }

    await audit({
      action: data.categoryId ? 'category.update' : 'category.create',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'category',
      entityId: categoryId,
      meta: { name: data.name },
    });

    revalidatePath('/categorias');
    revalidatePath('/lancamentos');
    revalidatePath('/painel');
    return success(data.categoryId ? 'Categoria atualizada.' : 'Categoria criada.');
  });
}

export async function deleteCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const categoryId = String(formData.get('categoryId') ?? '');
    const context = await requireSpace(spaceId);

    const category = await db.category.findFirst({
      where: { id: categoryId, spaceId },
      select: { id: true, name: true },
    });
    if (!category) throw new KnownError('Categoria não encontrada.');

    const used = await db.transaction.count({ where: { spaceId, categoryId } });

    if (used > 0) {
      // Arquivar em vez de apagar: os lançamentos antigos continuam
      // categorizados e o relatório histórico não muda.
      await db.category.update({ where: { id: category.id }, data: { archived: true } });
      await audit({
        action: 'category.update',
        userId: context.user.id,
        spaceId,
        entity: 'category',
        entityId: category.id,
        meta: { archived: true },
      });
      revalidatePath('/categorias');
      return success(
        `"${category.name}" foi arquivada — os ${used} lançamentos que a usam continuam intactos.`,
      );
    }

    await db.category.delete({ where: { id: category.id } });
    await audit({
      action: 'category.delete',
      userId: context.user.id,
      spaceId,
      entity: 'category',
      entityId: category.id,
      meta: { name: category.name },
    });

    revalidatePath('/categorias');
    return success('Categoria excluída.');
  });
}

export async function restoreCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const categoryId = String(formData.get('categoryId') ?? '');
    await requireSpace(spaceId);

    const updated = await db.category.updateMany({
      where: { id: categoryId, spaceId },
      data: { archived: false },
    });
    if (updated.count === 0) throw new KnownError('Categoria não encontrada.');

    revalidatePath('/categorias');
    return success('Categoria reativada.');
  });
}
