/**
 * Agregações do painel.
 *
 * Tudo aqui é somente leitura e sempre filtrado por `spaceId` — ver a regra
 * de ouro em src/lib/auth/guard.ts.
 */

import 'server-only';
import { db } from '@/lib/db';
import { monthRange, shiftMonthKey, type MonthKey } from '@/lib/date';
import { getAccountBalances, getNetWorth } from './accounts';

export interface MonthSummary {
  month: MonthKey;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  transactionCount: number;
}

/** Receitas, despesas e resultado de uma competência. */
export async function getMonthSummary(
  spaceId: string,
  month: MonthKey,
  monthStartDay = 1,
): Promise<MonthSummary> {
  const { start, end } = monthRange(month, monthStartDay);

  const rows = await db.transaction.groupBy({
    by: ['type'],
    where: { spaceId, date: { gte: start, lt: end }, type: { in: ['INCOME', 'EXPENSE'] } },
    _sum: { amountCents: true },
    _count: { _all: true },
  });

  let incomeCents = 0;
  let expenseCents = 0;
  let transactionCount = 0;

  for (const row of rows) {
    const amount = row._sum.amountCents ?? 0;
    transactionCount += row._count._all;
    if (row.type === 'INCOME') incomeCents = amount;
    else expenseCents = amount;
  }

  return {
    month,
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    transactionCount,
  };
}

export interface CategoryBreakdownItem {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string;
  amountCents: number;
  percent: number;
  transactionCount: number;
}

/** Gastos (ou receitas) por categoria numa competência, do maior para o menor. */
export async function getCategoryBreakdown(
  spaceId: string,
  month: MonthKey,
  kind: 'EXPENSE' | 'INCOME' = 'EXPENSE',
  monthStartDay = 1,
): Promise<CategoryBreakdownItem[]> {
  const { start, end } = monthRange(month, monthStartDay);

  const rows = await db.transaction.groupBy({
    by: ['categoryId'],
    where: { spaceId, type: kind, date: { gte: start, lt: end } },
    _sum: { amountCents: true },
    _count: { _all: true },
  });

  if (rows.length === 0) return [];

  const categoryIds = rows.map((r) => r.categoryId).filter((id): id is string => id !== null);
  const categories = await db.category.findMany({
    where: { id: { in: categoryIds }, spaceId },
    select: { id: true, name: true, color: true, icon: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));

  const total = rows.reduce((acc, r) => acc + (r._sum.amountCents ?? 0), 0);

  return rows
    .map((row) => {
      const category = row.categoryId ? byId.get(row.categoryId) : undefined;
      const amountCents = row._sum.amountCents ?? 0;
      return {
        categoryId: row.categoryId,
        name: category?.name ?? 'Sem categoria',
        color: category?.color ?? '#94a3b8',
        icon: category?.icon ?? 'circle-help',
        amountCents,
        percent: total > 0 ? (amountCents / total) * 100 : 0,
        transactionCount: row._count._all,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);
}

/** Série histórica de receitas x despesas, para o gráfico de evolução. */
export async function getMonthlyTrend(
  spaceId: string,
  endMonth: MonthKey,
  months = 6,
  monthStartDay = 1,
): Promise<MonthSummary[]> {
  const keys: MonthKey[] = [];
  for (let i = months - 1; i >= 0; i--) keys.push(shiftMonthKey(endMonth, -i));

  const first = monthRange(keys[0]!, monthStartDay).start;
  const last = monthRange(keys[keys.length - 1]!, monthStartDay).end;

  // Uma consulta cobre toda a janela; o agrupamento por competência é feito
  // em memória porque o limite do mês depende de `monthStartDay`, que o SQL
  // do Prisma não sabe calcular de forma portátil.
  const transactions = await db.transaction.findMany({
    where: {
      spaceId,
      type: { in: ['INCOME', 'EXPENSE'] },
      date: { gte: first, lt: last },
    },
    select: { type: true, amountCents: true, date: true },
  });

  const buckets = new Map<MonthKey, MonthSummary>(
    keys.map((month) => [
      month,
      { month, incomeCents: 0, expenseCents: 0, balanceCents: 0, transactionCount: 0 },
    ]),
  );

  const ranges = keys.map((month) => ({ month, ...monthRange(month, monthStartDay) }));

  for (const tx of transactions) {
    const range = ranges.find((r) => tx.date >= r.start && tx.date < r.end);
    if (!range) continue;
    const bucket = buckets.get(range.month)!;
    if (tx.type === 'INCOME') bucket.incomeCents += tx.amountCents;
    else bucket.expenseCents += tx.amountCents;
    bucket.transactionCount++;
  }

  for (const bucket of buckets.values()) {
    bucket.balanceCents = bucket.incomeCents - bucket.expenseCents;
  }

  return keys.map((k) => buckets.get(k)!);
}

export interface BudgetProgress {
  budgetId: string | null;
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  percent: number;
  status: 'ok' | 'atencao' | 'estourado';
}

/** Orçamentos da competência com o quanto já foi gasto em cada um. */
export async function getBudgetProgress(
  spaceId: string,
  month: MonthKey,
  monthStartDay = 1,
): Promise<BudgetProgress[]> {
  const { start, end } = monthRange(month, monthStartDay);

  const [budgets, spending] = await Promise.all([
    db.budget.findMany({
      where: { spaceId, month },
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    }),
    db.transaction.groupBy({
      by: ['categoryId'],
      where: { spaceId, type: 'EXPENSE', date: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
  ]);

  const spentByCategory = new Map(
    spending.map((s) => [s.categoryId ?? '', s._sum.amountCents ?? 0]),
  );

  return budgets
    .map((budget) => {
      const spentCents = spentByCategory.get(budget.categoryId) ?? 0;
      const percent = budget.limitCents > 0 ? (spentCents / budget.limitCents) * 100 : 0;
      const status: BudgetProgress['status'] =
        percent > 100 ? 'estourado' : percent >= 80 ? 'atencao' : 'ok';

      return {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        color: budget.category.color,
        icon: budget.category.icon,
        limitCents: budget.limitCents,
        spentCents,
        remainingCents: budget.limitCents - spentCents,
        percent,
        status,
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

/** Tudo que o painel precisa, em paralelo. */
export async function getDashboardData(
  spaceId: string,
  month: MonthKey,
  monthStartDay = 1,
) {
  const [summary, previousSummary, breakdown, incomeBreakdown, trend, budgets, accounts, netWorth] =
    await Promise.all([
      getMonthSummary(spaceId, month, monthStartDay),
      getMonthSummary(spaceId, shiftMonthKey(month, -1), monthStartDay),
      getCategoryBreakdown(spaceId, month, 'EXPENSE', monthStartDay),
      getCategoryBreakdown(spaceId, month, 'INCOME', monthStartDay),
      getMonthlyTrend(spaceId, month, 6, monthStartDay),
      getBudgetProgress(spaceId, month, monthStartDay),
      getAccountBalances(spaceId),
      getNetWorth(spaceId),
    ]);

  return { summary, previousSummary, breakdown, incomeBreakdown, trend, budgets, accounts, netWorth };
}
