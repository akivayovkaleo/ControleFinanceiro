import type { Metadata } from 'next';
import { PiggyBank } from 'lucide-react';
import { db } from '@/lib/db';
import { getActiveSpace, firstParam, type SearchParams } from '@/lib/space-context';
import { getBudgetProgress } from '@/server/queries/dashboard';
import { currentMonthKey, formatMonthKey, monthRange, parseMonthKey, shiftMonthKey } from '@/lib/date';
import { PageHeader } from '@/components/app/page-header';
import { MonthPicker } from '@/components/app/month-picker';
import { BudgetEditor, type BudgetRow } from '@/components/planning/budget-editor';
import { CopyBudgets } from '@/components/planning/copy-budgets';
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { Progress } from '@/components/ui/progress';

export const metadata: Metadata = { title: 'Orçamentos' };

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space } = context;

  const requestedMonth = firstParam(params, 'mes');
  const month = requestedMonth && parseMonthKey(requestedMonth) ? requestedMonth : currentMonthKey();
  const { start, end } = monthRange(month, space.monthStartDay);

  const [progress, categories, spending] = await Promise.all([
    getBudgetProgress(space.id, month, space.monthStartDay),
    db.category.findMany({
      where: { spaceId: space.id, kind: 'EXPENSE', archived: false },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, color: true },
    }),
    db.transaction.groupBy({
      by: ['categoryId'],
      where: { spaceId: space.id, type: 'EXPENSE', date: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
  ]);

  const spentByCategory = new Map(
    spending.map((s) => [s.categoryId ?? '', s._sum.amountCents ?? 0]),
  );
  const progressByCategory = new Map(progress.map((p) => [p.categoryId, p]));

  // Todas as categorias de despesa aparecem, com ou sem orçamento: assim dá
  // para definir um limite novo sem procurar num menu à parte.
  const rows: BudgetRow[] = categories.map((category) => {
    const existing = progressByCategory.get(category.id);
    if (existing) return existing;

    const spentCents = spentByCategory.get(category.id) ?? 0;
    return {
      budgetId: null,
      categoryId: category.id,
      categoryName: category.name,
      color: category.color,
      limitCents: 0,
      spentCents,
      percent: 0,
      status: 'ok' as const,
    };
  });

  const withBudget = rows.filter((r) => r.budgetId !== null);
  const totalLimit = withBudget.reduce((acc, r) => acc + r.limitCents, 0);
  const totalSpent = withBudget.reduce((acc, r) => acc + r.spentCents, 0);
  const totalPercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Orçamentos"
        description="Defina quanto pretende gastar em cada categoria neste mês."
        action={<MonthPicker month={month} />}
      />

      {withBudget.length > 0 && (
        <Card className="mb-5">
          <CardBody>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-sm text-muted">Total orçado em {formatMonthKey(month)}</p>
                <p className="mt-0.5">
                  <Money cents={totalSpent} currency={space.currency} tone="neutral" size="lg" />
                  <span className="ml-1.5 text-sm text-muted">
                    de <Money cents={totalLimit} currency={space.currency} tone="muted" size="sm" />
                  </span>
                </p>
              </div>
              <p
                className={
                  totalPercent > 100
                    ? 'text-sm font-semibold text-danger'
                    : 'text-sm font-semibold text-muted'
                }
              >
                {totalPercent.toFixed(0)}% usado
              </p>
            </div>
            <Progress
              value={totalPercent}
              showOverflow
              tone={totalPercent >= 80 ? 'warning' : 'brand'}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Por categoria"
          description={
            withBudget.length === 0
              ? 'Clique no lápis para definir um limite.'
              : `${withBudget.length} de ${rows.length} categorias com limite definido`
          }
          action={
            <CopyBudgets
              spaceId={space.id}
              fromMonth={shiftMonthKey(month, -1)}
              toMonth={month}
            />
          }
        />
        <CardBody className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<PiggyBank className="h-6 w-6" aria-hidden />}
              title="Nenhuma categoria de despesa"
              description="Crie categorias primeiro para poder orçá-las."
            />
          ) : (
            <ul>
              {rows.map((row) => (
                <BudgetEditor
                  key={row.categoryId}
                  spaceId={space.id}
                  month={month}
                  row={row}
                  currency={space.currency}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
