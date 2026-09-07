'use server';

/**
 * Lançamentos.
 *
 * Ponto de atenção: TODA despesa gera `TransactionShare` — inclusive em space
 * pessoal, onde o único share é da própria pessoa. Isso mantém uma regra só
 * ("o acerto lê shares") em vez de dois caminhos que divergem com o tempo.
 *
 * Transferências e receitas NÃO geram shares: transferência é dinheiro
 * andando dentro do próprio casal, e receita não é dívida de ninguém.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { assertSharesBalance, computeShares, effectiveSplitMode } from '@/lib/split';
import { requireSpace } from '@/lib/auth/guard';
import { deleteTransactionSchema, transactionSchema } from '@/lib/validation/finance';
import { KnownError, parseForm, runAction, success, type ActionState } from './result';

/** Confere que conta e categoria informadas pertencem MESMO a este space. */
async function assertBelongsToSpace(params: {
  spaceId: string;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  paidByMembershipId?: string | null;
  tagIds?: string[];
}): Promise<void> {
  const { spaceId, accountId, toAccountId, categoryId, paidByMembershipId, tagIds } = params;

  const accountIds = [accountId, ...(toAccountId ? [toAccountId] : [])];
  const accounts = await db.account.count({
    where: { id: { in: accountIds }, spaceId },
  });
  if (accounts !== accountIds.length) {
    throw new KnownError('Conta inválida para este espaço.', { accountId: 'Conta inválida' });
  }

  if (categoryId) {
    const category = await db.category.count({ where: { id: categoryId, spaceId } });
    if (category === 0) {
      throw new KnownError('Categoria inválida para este espaço.', {
        categoryId: 'Categoria inválida',
      });
    }
  }

  if (paidByMembershipId) {
    const membership = await db.membership.count({ where: { id: paidByMembershipId, spaceId } });
    if (membership === 0) {
      throw new KnownError('Pessoa inválida para este espaço.', {
        paidByMembershipId: 'Pessoa inválida',
      });
    }
  }

  // O banco já recusa etiqueta de outro espaço (chave estrangeira composta em
  // TransactionTag). Esta checagem existe para dar a mensagem legível antes.
  if (tagIds && tagIds.length > 0) {
    const found = await db.tag.count({ where: { id: { in: tagIds }, spaceId } });
    if (found !== tagIds.length) {
      throw new KnownError('Alguma etiqueta não pertence a este espaço.', {
        tagIds: 'Etiqueta inválida',
      });
    }
  }
}

export async function saveTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(transactionSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    await assertBelongsToSpace({
      spaceId: data.spaceId,
      accountId: data.accountId,
      toAccountId: data.toAccountId,
      categoryId: data.categoryId,
      paidByMembershipId: data.paidByMembershipId,
      tagIds: data.tagIds,
    });

    // Sem "quem pagou", assume quem está lançando — é o caso esmagadoramente
    // mais comum e evita um campo obrigatório a mais no formulário.
    const paidByMembershipId = data.paidByMembershipId ?? context.membership.id;
    const splitMode = effectiveSplitMode(data.splitMode, context.members.length);

    // Só despesa divide. Categoria não se aplica a transferência.
    const shares =
      data.type === 'EXPENSE'
        ? computeShares({
            amountCents: data.amountCents,
            mode: splitMode,
            members: context.members.map((m) => ({
              membershipId: m.id,
              monthlyIncomeCents: m.monthlyIncomeCents,
            })),
            paidByMembershipId,
            customShares: data.customShares,
          })
        : [];

    if (shares.length > 0) {
      // Guarda em runtime: um bug na divisão vira dinheiro errado no acerto.
      assertSharesBalance(data.amountCents, shares);
    }

    const payload = {
      spaceId: data.spaceId,
      type: data.type,
      amountCents: data.amountCents,
      date: data.date,
      description: data.description,
      notes: data.notes,
      accountId: data.accountId,
      toAccountId: data.type === 'TRANSFER' ? data.toAccountId : null,
      categoryId: data.type === 'TRANSFER' ? null : data.categoryId,
      paidByMembershipId,
      splitMode,
    };

    const isEdit = Boolean(data.transactionId);

    const transaction = await db.$transaction(async (tx) => {
      if (isEdit) {
        // updateMany com spaceId no where: impede editar lançamento de outro espaço.
        const updated = await tx.transaction.updateMany({
          where: { id: data.transactionId!, spaceId: data.spaceId, settlementId: null },
          data: payload,
        });

        if (updated.count === 0) {
          const exists = await tx.transaction.findFirst({
            where: { id: data.transactionId!, spaceId: data.spaceId },
            select: { settlementId: true },
          });
          if (exists?.settlementId) {
            throw new KnownError(
              'Este lançamento já entrou num acerto de contas. Desfaça o acerto para editá-lo.',
            );
          }
          throw new KnownError('Lançamento não encontrado.');
        }

        await tx.transactionShare.deleteMany({ where: { transactionId: data.transactionId! } });
        if (shares.length > 0) {
          await tx.transactionShare.createMany({
            data: shares.map((s) => ({
              transactionId: data.transactionId!,
              membershipId: s.membershipId,
              amountCents: s.amountCents,
            })),
          });
        }

        await tx.transactionTag.deleteMany({
          where: { transactionId: data.transactionId!, spaceId: data.spaceId },
        });
        if (data.tagIds.length > 0) {
          await tx.transactionTag.createMany({
            data: data.tagIds.map((tagId) => ({
              spaceId: data.spaceId,
              transactionId: data.transactionId!,
              tagId,
            })),
          });
        }

        return tx.transaction.findUniqueOrThrow({ where: { id: data.transactionId! } });
      }

      const created = await tx.transaction.create({ data: payload });
      if (data.tagIds.length > 0) {
        await tx.transactionTag.createMany({
          data: data.tagIds.map((tagId) => ({
            spaceId: data.spaceId,
            transactionId: created.id,
            tagId,
          })),
        });
      }
      if (shares.length > 0) {
        await tx.transactionShare.createMany({
          data: shares.map((s) => ({
            transactionId: created.id,
            membershipId: s.membershipId,
            amountCents: s.amountCents,
          })),
        });
      }
      return created;
    });

    await audit({
      action: isEdit ? 'transaction.update' : 'transaction.create',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'transaction',
      entityId: transaction.id,
      meta: { description: data.description, amountCents: data.amountCents, type: data.type },
    });

    revalidateFinance();
    return success(isEdit ? 'Lançamento atualizado.' : 'Lançamento registrado.', {
      transactionId: transaction.id,
    });
  });
}

export async function deleteTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(deleteTransactionSchema, formData);
    if (!parsed.ok) return parsed.state;

    const context = await requireSpace(parsed.data.spaceId);

    const existing = await db.transaction.findFirst({
      where: { id: parsed.data.transactionId, spaceId: parsed.data.spaceId },
      select: { id: true, description: true, amountCents: true, settlementId: true },
    });
    if (!existing) throw new KnownError('Lançamento não encontrado.');
    if (existing.settlementId) {
      throw new KnownError(
        'Este lançamento faz parte de um acerto de contas. Desfaça o acerto antes de excluí-lo.',
      );
    }

    // Os shares somem junto (onDelete: Cascade).
    await db.transaction.delete({ where: { id: existing.id } });

    await audit({
      action: 'transaction.delete',
      userId: context.user.id,
      spaceId: parsed.data.spaceId,
      entity: 'transaction',
      entityId: existing.id,
      meta: { description: existing.description, amountCents: existing.amountCents },
    });

    revalidateFinance();
    return success('Lançamento excluído.');
  });
}

/**
 * Duplicar é o atalho mais pedido num app de finanças: quase todo lançamento
 * novo é parecido com algum anterior.
 */
export async function duplicateTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(deleteTransactionSchema, formData);
    if (!parsed.ok) return parsed.state;

    const context = await requireSpace(parsed.data.spaceId);

    const original = await db.transaction.findFirst({
      where: { id: parsed.data.transactionId, spaceId: parsed.data.spaceId },
      include: { shares: true },
    });
    if (!original) throw new KnownError('Lançamento não encontrado.');

    const copy = await db.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          spaceId: original.spaceId,
          type: original.type,
          amountCents: original.amountCents,
          // A cópia nasce com a data de hoje, não a do original.
          date: new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'),
          description: original.description,
          notes: original.notes,
          accountId: original.accountId,
          toAccountId: original.toAccountId,
          categoryId: original.categoryId,
          paidByMembershipId: original.paidByMembershipId,
          splitMode: original.splitMode,
        },
      });

      if (original.shares.length > 0) {
        await tx.transactionShare.createMany({
          data: original.shares.map((s) => ({
            transactionId: created.id,
            membershipId: s.membershipId,
            amountCents: s.amountCents,
          })),
        });
      }
      return created;
    });

    await audit({
      action: 'transaction.create',
      userId: context.user.id,
      spaceId: parsed.data.spaceId,
      entity: 'transaction',
      entityId: copy.id,
      meta: { duplicatedFrom: original.id },
    });

    revalidateFinance();
    return success('Lançamento duplicado com a data de hoje.', { transactionId: copy.id });
  });
}

/** Invalida o cache das telas que mostram números. */
function revalidateFinance(): void {
  revalidatePath('/painel');
  revalidatePath('/lancamentos');
  revalidatePath('/orcamentos');
  revalidatePath('/acerto');
  revalidatePath('/contas');
}
