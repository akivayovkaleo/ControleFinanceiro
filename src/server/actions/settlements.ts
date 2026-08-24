'use server';

/**
 * Acerto de contas.
 *
 * Registrar um acerto significa dizer "até aqui está pago". Na prática:
 *   1. Calcula quem deve quanto a quem no período.
 *   2. Grava um `Settlement` com as linhas dessa dívida.
 *   3. Carimba `settlementId` nas despesas do período — elas saem do saldo
 *      em aberto, mas continuam no extrato.
 *
 * Nada de dinheiro se move aqui: o Pix acontece fora do app. Isto é o
 * registro de que aconteceu.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { requireSpace } from '@/lib/auth/guard';
import { getOpenSettlement } from '@/server/queries/settlement';
import { settlementSchema } from '@/lib/validation/finance';
import { KnownError, parseForm, runAction, success, type ActionState } from './result';

export async function createSettlementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(settlementSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    if (context.members.length < 2) {
      throw new KnownError('O acerto de contas só faz sentido num espaço com mais de uma pessoa.');
    }
    if (data.periodEnd < data.periodStart) {
      throw new KnownError('O fim do período não pode ser antes do início.');
    }

    // Recalcula no servidor: o número que o usuário viu na tela pode estar
    // desatualizado se a outra pessoa lançou algo enquanto isso.
    const view = await getOpenSettlement(
      data.spaceId,
      context.members.map((m) => ({ id: m.id, displayName: m.displayName, color: m.color })),
      // periodEnd é inclusivo para o usuário; o filtro é exclusivo.
      new Date(data.periodEnd.getTime() + 24 * 60 * 60 * 1000),
    );

    if (view.transfers.length === 0) {
      throw new KnownError('Não há nada a acertar neste período — vocês já estão quites.');
    }
    if (view.driftCents !== 0) {
      throw new KnownError(
        'Há uma inconsistência nos lançamentos deste período. Revise antes de registrar o acerto.',
      );
    }

    const settlement = await db.$transaction(async (tx) => {
      const created = await tx.settlement.create({
        data: {
          spaceId: data.spaceId,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          note: data.note,
          lines: {
            create: view.transfers.map((t) => ({
              fromMembershipId: t.fromMembershipId,
              toMembershipId: t.toMembershipId,
              amountCents: t.amountCents,
            })),
          },
        },
      });

      // Carimba as mesmas despesas que entraram no cálculo.
      await tx.transaction.updateMany({
        where: {
          spaceId: data.spaceId,
          type: 'EXPENSE',
          settlementId: null,
          date: { lt: new Date(data.periodEnd.getTime() + 24 * 60 * 60 * 1000) },
        },
        data: { settlementId: created.id },
      });

      return created;
    });

    await audit({
      action: 'settlement.create',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'settlement',
      entityId: settlement.id,
      meta: {
        transfers: view.transfers.length,
        totalCents: view.transfers.reduce((a, t) => a + t.amountCents, 0),
      },
    });

    revalidatePath('/acerto');
    revalidatePath('/lancamentos');
    revalidatePath('/painel');
    return success('Acerto registrado. Vocês estão quites até aqui.');
  });
}

/**
 * Desfaz um acerto: as despesas voltam ao saldo em aberto.
 * Necessário porque errar a data do período é fácil e refazer à mão seria
 * inviável.
 */
export async function deleteSettlementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const settlementId = String(formData.get('settlementId') ?? '');
    const context = await requireSpace(spaceId);

    const settlement = await db.settlement.findFirst({
      where: { id: settlementId, spaceId },
      select: { id: true },
    });
    if (!settlement) throw new KnownError('Acerto não encontrado.');

    await db.$transaction(async (tx) => {
      // Solta as despesas antes de apagar o acerto.
      await tx.transaction.updateMany({
        where: { spaceId, settlementId: settlement.id },
        data: { settlementId: null },
      });
      await tx.settlement.delete({ where: { id: settlement.id } });
    });

    await audit({
      action: 'settlement.delete',
      userId: context.user.id,
      spaceId,
      entity: 'settlement',
      entityId: settlement.id,
    });

    revalidatePath('/acerto');
    revalidatePath('/lancamentos');
    return success('Acerto desfeito. As despesas voltaram para o saldo em aberto.');
  });
}
