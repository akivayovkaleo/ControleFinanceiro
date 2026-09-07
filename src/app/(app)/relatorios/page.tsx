import type { Metadata } from 'next';
import { BarChart3, TrendingUp } from 'lucide-react';
import { firstParam, getActiveSpace, type SearchParams } from '@/lib/space-context';
import {
  currentMonthKey,
  formatDateShort,
  formatMonthKeyShort,
  parseMonthKey,
} from '@/lib/date';
import { getCategoryBreakdown, getMonthlyTrend, getMonthSummary } from '@/server/queries/dashboard';
import { getNetWorthHistory } from '@/server/queries/investments';
import { getNetWorth } from '@/server/queries/accounts';
import { netWorthChange } from '@/lib/investments';
import { PageHeader } from '@/components/app/page-header';
import { MonthPicker } from '@/components/app/month-picker';
import { CategoryDonut, TrendChart } from '@/components/dashboard/charts';
import { NetWorthChart } from '@/components/reports/net-worth-chart';
import { CaptureSnapshot } from '@/components/investments/capture-snapshot';
import { Card, CardBody, EmptyState } from '@/components/ui/card';
import { Money } from '@/components/ui/money';

export const metadata: Metadata = { title: 'Relatórios' };

/** Doze meses: um ano inteiro mostra a sazonalidade que seis meses escondem. */
const TREND_MONTHS = 12;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { space } = await getActiveSpace(params);

  const requestedMonth = firstParam(params, 'mes');
  const month = requestedMonth && parseMonthKey(requestedMonth) ? requestedMonth : currentMonthKey();

  const [summary, trend, expenses, incomes, history, netWorth] = await Promise.all([
    getMonthSummary(space.id, month, space.monthStartDay),
    getMonthlyTrend(space.id, month, TREND_MONTHS, space.monthStartDay),
    getCategoryBreakdown(space.id, month, 'EXPENSE', space.monthStartDay),
    getCategoryBreakdown(space.id, month, 'INCOME', space.monthStartDay),
    getNetWorthHistory(space.id),
    getNetWorth(space.id),
  ]);

  const change = netWorthChange(history);

  const historyView = history.map((point) => ({
    day: point.capturedOn.toISOString().slice(0, 10),
    label: formatDateShort(point.capturedOn).slice(0, 5),
    netCents: point.netCents,
    investedCents: point.investedCents,
  }));

  const trendView = trend.map((m) => ({
    month: formatMonthKeyShort(m.month),
    incomeCents: m.incomeCents,
    expenseCents: m.expenseCents,
  }));

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="O ano inteiro de uma vez: para onde o dinheiro foi e se o patrimônio está subindo."
        action={<MonthPicker month={month} />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm text-muted">Receitas do mês</p>
          <Money cents={summary.incomeCents} currency={space.currency} tone="income" size="md" />
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Despesas do mês</p>
          <Money cents={summary.expenseCents} currency={space.currency} tone="expense" size="md" />
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">
            {summary.incomeCents - summary.expenseCents >= 0 ? 'Sobrou' : 'Faltou'}
          </p>
          <Money
            cents={summary.incomeCents - summary.expenseCents}
            currency={space.currency}
            tone="auto"
            size="md"
          />
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Patrimônio hoje</p>
          <Money cents={netWorth.totalCents} currency={space.currency} tone="auto" size="md" />
        </div>
      </div>

      <div className="mb-5 card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold text-fg">Evolução do patrimônio</h2>
            {change ? (
              <p className="mt-0.5 text-xs text-muted">
                <Money
                  cents={change.absoluteCents}
                  currency={space.currency}
                  size="xs"
                  tone={change.absoluteCents >= 0 ? 'income' : 'expense'}
                  signed
                />
                {change.percent !== null &&
                  ` (${change.percent >= 0 ? '+' : ''}${change.percent
                    .toFixed(1)
                    .replace('.', ',')}%)`}{' '}
                desde a primeira medição
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted">
                A curva começa na segunda medição.
              </p>
            )}
          </div>
          <CaptureSnapshot spaceId={space.id} />
        </div>

        <CardBody>
          {historyView.length < 2 ? (
            <EmptyState
              icon={<TrendingUp className="h-6 w-6" aria-hidden />}
              title="Ainda não há histórico"
              description="O patrimônio de hoje é sempre calculado na hora, mas a curva no tempo precisa ser registrada: a cotação de hoje some quando você atualizar o preço amanhã. Toque em “Registrar hoje” de vez em quando — uma vez por mês já desenha a linha."
            />
          ) : (
            <NetWorthChart data={historyView} currency={space.currency} />
          )}
        </CardBody>
      </div>

      <div className="mb-5 card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-fg">Receitas e despesas, mês a mês</h2>
          <p className="mt-0.5 text-xs text-muted">Últimos {TREND_MONTHS} meses</p>
        </div>
        <CardBody>
          <TrendChart data={trendView} currency={space.currency} />
        </CardBody>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownPanel
          title="Para onde foi o dinheiro"
          items={expenses}
          currency={space.currency}
        />
        <BreakdownPanel title="De onde veio o dinheiro" items={incomes} currency={space.currency} />
      </div>
    </>
  );
}

function BreakdownPanel({
  title,
  items,
  currency,
}: {
  title: string;
  items: Array<{
    categoryId: string | null;
    name: string;
    color: string;
    amountCents: number;
    percent: number;
  }>;
  currency: string;
}) {
  return (
    <div className="card">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
      </div>
      <CardBody>
        {items.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" aria-hidden />}
            title="Nada nesta competência"
            description="Sem lançamentos no período escolhido."
          />
        ) : (
          <>
            <CategoryDonut
              data={items.map((i) => ({
                name: i.name,
                amountCents: i.amountCents,
                color: i.color,
              }))}
              currency={currency}
            />
            <ul className="mt-3 space-y-2">
              {items.slice(0, 8).map((item) => (
                <li
                  key={item.categoryId ?? item.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden
                    />
                    <span className="truncate text-muted">{item.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-2xs text-muted">{item.percent.toFixed(0)}%</span>
                    <Money cents={item.amountCents} currency={currency} size="xs" />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </div>
  );
}
