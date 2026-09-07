'use server';

/**
 * Escrita da carteira de investimentos.
 *
 * Toda query traz `spaceId` no `where` — inclusive nos updates e deletes, que
 * usam `updateMany`/`deleteMany` para que o filtro de autorização vá junto na
 * própria query, em vez de depender de uma checagem separada (regra 2 do
 * CLAUDE.md).
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { requireSpace } from '@/lib/auth/guard';
import { todayUtc } from '@/lib/date';
import { computeNetWorth, portfolioValueCents, type HoldingType } from '@/lib/investments';
import {
  captureSnapshotSchema,
  deleteHoldingSchema,
  holdingSchema,
  updateHoldingPriceSchema,
} from '@/lib/validation/investments';
import { getAccountBalances } from '@/server/queries/accounts';
import { KnownError, parseForm, runAction, success, type ActionState } from './result';

export async function saveHoldingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(holdingSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    // A conta precisa ser do mesmo space: sem esta checagem daria para
    // pendurar uma posição numa conta de outro espaço passando o id na mão.
    const account = await db.account.findFirst({
      where: { id: data.accountId, spaceId: data.spaceId },
      select: { id: true, name: true },
    });
    if (!account) {
      throw new KnownError('Escolha uma conta válida.', { accountId: 'Conta inválida' });
    }

    const fields = {
      accountId: data.accountId,
      name: data.name,
      ticker: data.ticker,
      type: data.type as HoldingType,
      quantity: data.quantity,
      avgPriceCents: data.avgPriceCents,
      currentPriceCents: data.currentPriceCents,
      notes: data.notes,
    };

    if (data.holdingId) {
      const updated = await db.holding.updateMany({
        where: { id: data.holdingId, spaceId: data.spaceId },
        data: fields,
      });
      if (updated.count === 0) throw new KnownError('Posição não encontrada.');

      await audit({
        action: 'holding.update',
        userId: context.user.id,
        spaceId: data.spaceId,
        entity: 'holding',
        entityId: data.holdingId,
        meta: { name: data.name },
      });
    } else {
      const created = await db.holding.create({
        data: { spaceId: data.spaceId, ...fields },
        select: { id: true },
      });

      await audit({
        action: 'holding.create',
        userId: context.user.id,
        spaceId: data.spaceId,
        entity: 'holding',
        entityId: created.id,
        meta: { name: data.name },
      });
    }

    revalidatePath('/investimentos');
    revalidatePath('/contas');
    revalidatePath('/painel');
    return success(data.holdingId ? 'Posição atualizada.' : `${data.name} entrou na carteira.`);
  });
}

export async function updateHoldingPriceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(updateHoldingPriceSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    await requireSpace(data.spaceId);

    const updated = await db.holding.updateMany({
      where: { id: data.holdingId, spaceId: data.spaceId },
      data: { currentPriceCents: data.currentPriceCents },
    });
    if (updated.count === 0) throw new KnownError('Posição não encontrada.');

    revalidatePath('/investimentos');
    revalidatePath('/contas');
    revalidatePath('/painel');
    return success('Cotação atualizada.');
  });
}

export async function deleteHoldingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(deleteHoldingSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const deleted = await db.holding.deleteMany({
      where: { id: data.holdingId, spaceId: data.spaceId },
    });
    if (deleted.count === 0) throw new KnownError('Posição não encontrada.');

    await audit({
      action: 'holding.delete',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'holding',
      entityId: data.holdingId,
    });

    revalidatePath('/investimentos');
    revalidatePath('/contas');
    revalidatePath('/painel');
    return success('Posição removida da carteira.');
  });
}

/**
 * Grava a fotografia do patrimônio de hoje.
 *
 * Precisa ser um ato explícito porque a curva não dá para reconstruir depois: a
 * cotação que uma posição tinha em março some no instante em que ela é
 * atualizada em abril. Refotografar no mesmo dia atualiza a linha em vez de
 * criar outra — daí o `upsert` na chave (space, dia).
 */
export async function captureNetWorthSnapshotAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(captureSnapshotSchema, formData);
    if (!parsed.ok) return parsed.state;

    const { spaceId } = parsed.data;
    const context = await requireSpace(spaceId);

    // O saldo é derivado dos lançamentos, nunca materializado — por isso a
    // fotografia é montada a partir da mesma leitura que a tela usa, e não de
    // uma segunda conta que poderia divergir dela.
    const [balances, holdings] = await Promise.all([
      getAccountBalances(spaceId),
      db.holding.findMany({
        where: { spaceId },
        select: { quantity: true, currentPriceCents: true },
      }),
    ]);

    const net = computeNetWorth(balances, portfolioValueCents(holdings));
    const capturedOn = todayUtc();

    await db.netWorthSnapshot.upsert({
      where: { spaceId_capturedOn: { spaceId, capturedOn } },
      create: {
        spaceId,
        capturedOn,
        assetsCents: net.assetsCents,
        liabilitiesCents: net.liabilitiesCents,
        netCents: net.netCents,
        investedCents: net.investedCents,
      },
      update: {
        assetsCents: net.assetsCents,
        liabilitiesCents: net.liabilitiesCents,
        netCents: net.netCents,
        investedCents: net.investedCents,
      },
    });

    await audit({
      action: 'networth.capture',
      userId: context.user.id,
      spaceId,
      entity: 'netWorthSnapshot',
      meta: { netCents: net.netCents },
    });

    revalidatePath('/investimentos');
    revalidatePath('/relatorios');
    return success('Patrimônio de hoje registrado.');
  });
}
