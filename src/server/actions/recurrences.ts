'use server';

/**
 * Recorrências — aluguel, salário, assinaturas.
 *
 * A geração é sob demanda (ver src/lib/recurrence.ts): quando alguém abre o
 * app, as ocorrências vencidas viram lançamentos de verdade. Depois disso são
 * lançamentos comuns, editáveis e apagáveis individualmente.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { pendingOccurrences } from '@/lib/recurrence';
import { computeShares, effectiveSplitMode } from '@/lib/split';
import { requireSpace, type SpaceContext } from '@/lib/auth/guard';
import { recurrenceSchema } from '@/lib/validation/finance';
import { KnownError, parseForm, runAction, success, type ActionState } from './result';

export async function saveRecurrenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(recurrenceSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const account = await db.account.count({ where: { id: data.accountId, spaceId: data.spaceId } });
    if (account === 0) {
      throw new KnownError('Conta inválida.', { accountId: 'Conta inválida' });
    }
    if (data.categoryId) {
      const category = await db.category.count({
        where: { id: data.categoryId, spaceId: data.spaceId },
      });
      if (category === 0) {
        throw new KnownError('Categoria inválida.', { categoryId: 'Categoria inválida' });
      }
    }

    const payload = {
      spaceId: data.spaceId,
      type: data.type,
      amountCents: data.amountCents,
      description: data.description,
      accountId: data.accountId,
      categoryId: data.categoryId,
      paidByMembershipId: data.paidByMembershipId ?? context.membership.id,
      splitMode: effectiveSplitMode(data.splitMode, context.members.length),
      frequency: data.frequency,
      nextRunAt: data.nextRunAt,
      endsAt: data.endsAt,
      active: data.active,
    };

    let recurrenceId = data.recurrenceId;

    if (recurrenceId) {
      const updated = await db.recurrence.updateMany({
        where: { id: recurrenceId, spaceId: data.spaceId },
        data: payload,
      });
      if (updated.count === 0) throw new KnownError('Recorrência não encontrada.');
    } else {
      const created = await db.recurrence.create({ data: payload });
      recurrenceId = created.id;
    }

    await audit({
      action: data.recurrenceId ? 'recurrence.update' : 'recurrence.create',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'recurrence',
      entityId: recurrenceId,
      meta: { description: data.description },
    });

    revalidatePath('/recorrencias');
    return success(data.recurrenceId ? 'Recorrência atualizada.' : 'Recorrência criada.');
  });
}

export async function deleteRecurrenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const recurrenceId = String(formData.get('recurrenceId') ?? '');
    const context = await requireSpace(spaceId);

    const deleted = await db.recurrence.deleteMany({ where: { id: recurrenceId, spaceId } });
    if (deleted.count === 0) throw new KnownError('Recorrência não encontrada.');

    await audit({
      action: 'recurrence.delete',
      userId: context.user.id,
      spaceId,
      entity: 'recurrence',
      entityId: recurrenceId,
    });

    revalidatePath('/recorrencias');
    return success('Recorrência excluída. Os lançamentos já gerados foram mantidos.');
  });
}

export async function toggleRecurrenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const recurrenceId = String(formData.get('recurrenceId') ?? '');
    await requireSpace(spaceId);

    const recurrence = await db.recurrence.findFirst({
      where: { id: recurrenceId, spaceId },
      select: { id: true, active: true },
    });
    if (!recurrence) throw new KnownError('Recorrência não encontrada.');

    await db.recurrence.update({
      where: { id: recurrence.id },
      data: { active: !recurrence.active },
    });

    revalidatePath('/recorrencias');
    return success(recurrence.active ? 'Recorrência pausada.' : 'Recorrência reativada.');
  });
}

/**
 * Gera os lançamentos pendentes de todas as recorrências ativas do espaço.
 *
 * Chamada de forma oportunista pelo layout do app e manualmente pelo botão na
 * tela de recorrências. É idempotente: `nextRunAt` avança junto com a geração,
 * então rodar duas vezes seguidas não duplica nada.
 */
export async function materializeRecurrences(
  context: SpaceContext,
): Promise<{ created: number }> {
  const recurrences = await db.recurrence.findMany({
    where: { spaceId: context.space.id, active: true, nextRunAt: { lte: new Date() } },
  });

  if (recurrences.length === 0) return { created: 0 };

  let created = 0;

  for (const recurrence of recurrences) {
    const { dates, newNextRunAt } = pendingOccurrences({
      nextRunAt: recurrence.nextRunAt,
      frequency: recurrence.frequency,
      endsAt: recurrence.endsAt,
    });

    if (dates.length === 0) continue;

    const shares =
      recurrence.type === 'EXPENSE'
        ? computeShares({
            amountCents: recurrence.amountCents,
            mode: recurrence.splitMode,
            members: context.members.map((m) => ({
              membershipId: m.id,
              monthlyIncomeCents: m.monthlyIncomeCents,
            })),
            paidByMembershipId: recurrence.paidByMembershipId,
          })
        : [];

    await db.$transaction(async (tx) => {
      for (const date of dates) {
        const transaction = await tx.transaction.create({
          data: {
            spaceId: recurrence.spaceId,
            type: recurrence.type,
            amountCents: recurrence.amountCents,
            date,
            description: recurrence.description,
            accountId: recurrence.accountId,
            categoryId: recurrence.categoryId,
            paidByMembershipId: recurrence.paidByMembershipId,
            splitMode: recurrence.splitMode,
            recurrenceId: recurrence.id,
          },
        });

        if (shares.length > 0) {
          await tx.transactionShare.createMany({
            data: shares.map((s) => ({
              transactionId: transaction.id,
              membershipId: s.membershipId,
              amountCents: s.amountCents,
            })),
          });
        }
        created++;
      }

      // Avançar o cursor na mesma transação é o que garante idempotência.
      await tx.recurrence.update({
        where: { id: recurrence.id },
        data: {
          nextRunAt: newNextRunAt,
          active: recurrence.endsAt ? newNextRunAt <= recurrence.endsAt : true,
        },
      });
    });
  }

  if (created > 0) {
    await audit({
      action: 'recurrence.materialize',
      userId: context.user.id,
      spaceId: context.space.id,
      meta: { created },
    });
  }

  return { created };
}

export async function runRecurrencesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const context = await requireSpace(spaceId);

    const { created } = await materializeRecurrences(context);

    revalidatePath('/recorrencias');
    revalidatePath('/lancamentos');
    revalidatePath('/painel');

    return success(
      created === 0
        ? 'Nenhuma recorrência vencida no momento.'
        : `${created} lançamento${created > 1 ? 's' : ''} gerado${created > 1 ? 's' : ''}.`,
    );
  });
}
