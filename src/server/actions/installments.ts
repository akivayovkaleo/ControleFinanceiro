'use server';

/**
 * Compra parcelada.
 *
 * Cria **um plano e N lançamentos**, não um lançamento com um campo "parcelas".
 * A razão é o extrato: uma compra de R$ 1.200 em 12x não tirou R$ 1.200 do mês
 * um — tirou R$ 100. Com uma linha por parcela, saldo, orçamento e fatura veem
 * o valor que realmente cai em cada mês, sem nenhum deles precisar saber que
 * parcelamento existe.
 *
 * Cada parcela é uma despesa como qualquer outra e por isso divide como
 * qualquer outra: os `TransactionShare` são calculados por parcela, e cada
 * conjunto soma exatamente o valor daquela parcela.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { requireSpace } from '@/lib/auth/guard';
import { assertSharesBalance, computeShares, effectiveSplitMode } from '@/lib/split';
import { buildInstallments, installmentsSum, monthlyInstallmentDates } from '@/lib/installments';
import {
  installmentDatesForCard,
  DEFAULT_STATEMENT_INCLUSIVE,
  type CardConfig,
} from '@/lib/credit-card';
import {
  deleteInstallmentPlanSchema,
  installmentPurchaseSchema,
} from '@/lib/validation/installments';
import { KnownError, parseForm, runAction, success, type ActionState } from './result';

export async function createInstallmentPurchaseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(installmentPurchaseSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const account = await db.account.findFirst({
      where: { id: data.accountId, spaceId: data.spaceId },
    });
    if (!account) {
      throw new KnownError('Conta inválida para este espaço.', { accountId: 'Conta inválida' });
    }

    if (data.categoryId) {
      const category = await db.category.count({
        where: { id: data.categoryId, spaceId: data.spaceId },
      });
      if (category === 0) {
        throw new KnownError('Categoria inválida para este espaço.', {
          categoryId: 'Categoria inválida',
        });
      }
    }

    if (data.paidByMembershipId) {
      const membership = await db.membership.count({
        where: { id: data.paidByMembershipId, spaceId: data.spaceId },
      });
      if (membership === 0) {
        throw new KnownError('Pessoa inválida para este espaço.', {
          paidByMembershipId: 'Pessoa inválida',
        });
      }
    }

    /**
     * No cartão, quem manda no calendário é o ciclo de fechamento, não o mês.
     * Fora dele (carnê, crediário, boleto), o mês civil basta.
     */
    const dates =
      account.type === 'CREDIT_CARD' && account.statementDay
        ? installmentDatesForCard(data.purchaseDate, data.count, {
            closingDay: account.statementDay,
            dueDay: account.dueDay ?? 10,
            limitCents: account.creditLimitCents,
            statementInclusive: account.statementInclusive ?? DEFAULT_STATEMENT_INCLUSIVE,
          } satisfies CardConfig)
        : monthlyInstallmentDates(data.purchaseDate, data.count);

    // Lança `KnownError` legível em vez de estourar: "R$ 0,01 é pouco para 3
    // parcelas" é o tipo de coisa que a pessoa precisa ler, não um 500.
    let parts;
    try {
      parts = buildInstallments(data.totalCents, dates);
    } catch (error) {
      throw new KnownError(
        error instanceof Error ? error.message : 'Não foi possível dividir esse valor.',
        { totalCents: 'Confira o valor e o número de parcelas' },
      );
    }

    // Nada pode se perder entre o total digitado e as parcelas gravadas.
    if (installmentsSum(parts) !== data.totalCents) {
      throw new KnownError('A soma das parcelas não bateu com o total. Nada foi gravado.');
    }

    const paidByMembershipId = data.paidByMembershipId ?? context.membership.id;
    const splitMode = effectiveSplitMode(data.splitMode, context.members.length);
    const members = context.members.map((m) => ({
      membershipId: m.id,
      monthlyIncomeCents: m.monthlyIncomeCents,
    }));

    const plan = await db.$transaction(async (tx) => {
      const created = await tx.installmentPlan.create({
        data: {
          spaceId: data.spaceId,
          description: data.description,
          totalCents: data.totalCents,
          count: data.count,
          purchaseDate: data.purchaseDate,
          accountId: data.accountId,
          categoryId: data.categoryId,
        },
      });

      for (const part of parts) {
        const shares = computeShares({
          amountCents: part.amountCents,
          mode: splitMode,
          members,
          paidByMembershipId,
        });
        // Guarda em runtime: um bug na divisão vira dinheiro errado no acerto.
        assertSharesBalance(part.amountCents, shares);

        const transaction = await tx.transaction.create({
          data: {
            spaceId: data.spaceId,
            type: 'EXPENSE',
            amountCents: part.amountCents,
            date: part.date,
            description: data.description,
            notes: data.notes,
            accountId: data.accountId,
            categoryId: data.categoryId,
            paidByMembershipId,
            splitMode,
            installmentPlanId: created.id,
            installmentNumber: part.number,
            installmentTotal: part.total,
          },
        });

        await tx.transactionShare.createMany({
          data: shares.map((s) => ({
            transactionId: transaction.id,
            membershipId: s.membershipId,
            amountCents: s.amountCents,
          })),
        });
      }

      return created;
    });

    await audit({
      action: 'installment.create',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'installmentPlan',
      entityId: plan.id,
      meta: { description: data.description, totalCents: data.totalCents, count: data.count },
    });

    revalidateFinance();
    return success(`${data.description} lançada em ${data.count}x.`);
  });
}

/**
 * Apaga o plano e, por cascade, todas as parcelas.
 *
 * Uma parcela já incluída num acerto de contas trava a exclusão: apagá-la
 * mudaria um acerto que as duas pessoas já deram por fechado.
 */
export async function deleteInstallmentPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(deleteInstallmentPlanSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const plan = await db.installmentPlan.findFirst({
      where: { id: data.planId, spaceId: data.spaceId },
      select: {
        id: true,
        description: true,
        transactions: { select: { settlementId: true }, where: { settlementId: { not: null } } },
      },
    });
    if (!plan) throw new KnownError('Compra parcelada não encontrada.');

    if (plan.transactions.length > 0) {
      throw new KnownError(
        'Alguma parcela já entrou num acerto de contas. Desfaça o acerto para excluir a compra.',
      );
    }

    await db.installmentPlan.deleteMany({ where: { id: data.planId, spaceId: data.spaceId } });

    await audit({
      action: 'installment.delete',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'installmentPlan',
      entityId: data.planId,
      meta: { description: plan.description },
    });

    revalidateFinance();
    return success('Compra parcelada excluída, com todas as parcelas.');
  });
}

function revalidateFinance(): void {
  revalidatePath('/lancamentos');
  revalidatePath('/painel');
  revalidatePath('/cartoes');
  revalidatePath('/contas');
  revalidatePath('/orcamentos');
}
