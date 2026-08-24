'use server';

/**
 * Orçamentos e metas — o lado do "para onde eu quero ir", em contraste com o
 * extrato, que é o "para onde o dinheiro foi".
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { requireSpace } from '@/lib/auth/guard';
import { budgetSchema, deleteBudgetSchema, goalContributionSchema, goalSchema } from '@/lib/validation/finance';
import { KnownError, parseForm, runAction, success, type ActionState } from './result';

// ------------------------------------------------------------ orçamentos

export async function setBudgetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(budgetSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const category = await db.category.findFirst({
      where: { id: data.categoryId, spaceId: data.spaceId, kind: 'EXPENSE' },
      select: { id: true, name: true },
    });
    if (!category) {
      throw new KnownError('Só é possível orçar categorias de despesa.', {
        categoryId: 'Categoria inválida',
      });
    }

    await db.budget.upsert({
      where: {
        spaceId_categoryId_month: {
          spaceId: data.spaceId,
          categoryId: data.categoryId,
          month: data.month,
        },
      },
      create: {
        spaceId: data.spaceId,
        categoryId: data.categoryId,
        month: data.month,
        limitCents: data.limitCents,
      },
      update: { limitCents: data.limitCents },
    });

    await audit({
      action: 'budget.set',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'budget',
      meta: { category: category.name, month: data.month, limitCents: data.limitCents },
    });

    revalidatePath('/orcamentos');
    revalidatePath('/painel');
    return success(`Orçamento de ${category.name} definido.`);
  });
}

export async function deleteBudgetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(deleteBudgetSchema, formData);
    if (!parsed.ok) return parsed.state;

    const context = await requireSpace(parsed.data.spaceId);

    const deleted = await db.budget.deleteMany({
      where: { id: parsed.data.budgetId, spaceId: parsed.data.spaceId },
    });
    if (deleted.count === 0) throw new KnownError('Orçamento não encontrado.');

    await audit({
      action: 'budget.delete',
      userId: context.user.id,
      spaceId: parsed.data.spaceId,
      entity: 'budget',
      entityId: parsed.data.budgetId,
    });

    revalidatePath('/orcamentos');
    revalidatePath('/painel');
    return success('Orçamento removido.');
  });
}

/**
 * Copia os orçamentos de uma competência para outra. Sem isso, definir os
 * mesmos limites todo mês é trabalho manual repetitivo — e o que acontece na
 * prática é a pessoa parar de orçar.
 */
export async function copyBudgetsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const fromMonth = String(formData.get('fromMonth') ?? '');
    const toMonth = String(formData.get('toMonth') ?? '');
    const context = await requireSpace(spaceId);

    if (!/^\d{4}-\d{2}$/.test(fromMonth) || !/^\d{4}-\d{2}$/.test(toMonth)) {
      throw new KnownError('Competência inválida.');
    }

    const source = await db.budget.findMany({ where: { spaceId, month: fromMonth } });
    if (source.length === 0) {
      throw new KnownError('Não há orçamentos na competência de origem.');
    }

    for (const budget of source) {
      await db.budget.upsert({
        where: {
          spaceId_categoryId_month: { spaceId, categoryId: budget.categoryId, month: toMonth },
        },
        create: { spaceId, categoryId: budget.categoryId, month: toMonth, limitCents: budget.limitCents },
        update: { limitCents: budget.limitCents },
      });
    }

    await audit({
      action: 'budget.set',
      userId: context.user.id,
      spaceId,
      meta: { copiedFrom: fromMonth, to: toMonth, count: source.length },
    });

    revalidatePath('/orcamentos');
    return success(`${source.length} orçamentos copiados.`);
  });
}

// ----------------------------------------------------------------- metas

export async function saveGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(goalSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const payload = {
      spaceId: data.spaceId,
      name: data.name,
      targetCents: data.targetCents,
      targetDate: data.targetDate,
      color: data.color,
      icon: data.icon,
    };

    let goalId = data.goalId;

    if (goalId) {
      const updated = await db.goal.updateMany({
        where: { id: goalId, spaceId: data.spaceId },
        data: payload,
      });
      if (updated.count === 0) throw new KnownError('Meta não encontrada.');
    } else {
      const created = await db.goal.create({ data: payload });
      goalId = created.id;
    }

    await audit({
      action: data.goalId ? 'goal.update' : 'goal.create',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'goal',
      entityId: goalId,
      meta: { name: data.name, targetCents: data.targetCents },
    });

    revalidatePath('/metas');
    return success(data.goalId ? 'Meta atualizada.' : 'Meta criada.', { goalId });
  });
}

export async function contributeToGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(goalContributionSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const goal = await db.goal.findFirst({
      where: { id: data.goalId, spaceId: data.spaceId },
      select: { id: true, name: true },
    });
    if (!goal) throw new KnownError('Meta não encontrada.');

    await db.goalContribution.create({
      data: {
        goalId: goal.id,
        membershipId: context.membership.id,
        amountCents: data.amountCents,
        date: data.date,
        note: data.note,
      },
    });

    await audit({
      action: 'goal.contribute',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'goal',
      entityId: goal.id,
      meta: { amountCents: data.amountCents },
    });

    revalidatePath('/metas');
    return success(`Guardado em "${goal.name}".`);
  });
}

export async function deleteGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const goalId = String(formData.get('goalId') ?? '');
    const context = await requireSpace(spaceId);

    const deleted = await db.goal.deleteMany({ where: { id: goalId, spaceId } });
    if (deleted.count === 0) throw new KnownError('Meta não encontrada.');

    await audit({
      action: 'goal.delete',
      userId: context.user.id,
      spaceId,
      entity: 'goal',
      entityId: goalId,
    });

    revalidatePath('/metas');
    return success('Meta excluída.');
  });
}

export async function deleteGoalContributionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const contributionId = String(formData.get('contributionId') ?? '');
    await requireSpace(spaceId);

    // O join por `goal.spaceId` garante que a contribuição é deste espaço.
    const deleted = await db.goalContribution.deleteMany({
      where: { id: contributionId, goal: { spaceId } },
    });
    if (deleted.count === 0) throw new KnownError('Aporte não encontrado.');

    revalidatePath('/metas');
    return success('Aporte removido.');
  });
}
