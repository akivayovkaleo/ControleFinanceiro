import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { getActiveSpace, firstParam, type SearchParams } from '@/lib/space-context';
import { getDashboardData } from '@/server/queries/dashboard';
import { getOpenSettlement } from '@/server/queries/settlement';
import { db } from '@/lib/db';
import { currentMonthKey, formatMonthKey, parseMonthKey } from '@/lib/date';
import { PageHeader } from '@/components/app/page-header';
import { MonthPicker } from '@/components/app/month-picker';
import { StatCard } from '@/components/dashboard/stat-card';
import { CategoryDonut, TrendChart } from '@/components/dashboard/charts';
import { CategoryList } from '@/components/dashboard/category-list';
import { SettlementCallout } from '@/components/dashboard/settlement-callout';
import { TransactionList } from '@/components/transactions/transaction-list';
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { Progress } from '@/components/ui/progress';
import { ACCOUNT_TYPE_LABELS } from '@/lib/presets';

export const metadata: Metadata = { title: 'Painel' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space, members, isShared } = context;

  const requestedMonth = firstParam(params, 'mes');
  const month = requestedMonth && parseMonthKey(requestedMonth) ? requestedMonth : currentMonthKey();

  const [data, recent, settlement] = await Promise.all([
    getDashboardData(space.id, month, space.monthStartDay),
    db.transaction.findMany({
      where: { spaceId: space.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        type: true,
        amountCents: true,
        date: true,
        description: true,
        splitMode: true,
        settlementId: true,
        category: { select: { name: true, color: true } },
        account: { select: { name: true, color: true } },
        toAccount: { select: { name: true } },
        paidBy: { select: { displayName: true, color: true } },
        shares: { select: { membershipId: true, amountCents: true } },
      },
    }),
    isShared
      ? getOpenSettlement(
          space.id,
          members.map((m) => ({ id: m.id, displayName: m.displayName, color: m.color })),
        )
      : null,
  ]);

  const { summary, previousSummary, breakdown, trend, budgets, accounts, netWorth } = data;
  const currency = space.currency;
  const isEmpty = accounts.every((a) => a.transactionCount === 0);

  return (
    <>
      <PageHeader
        title="Painel"
        description={
          isShared
            ? `${space.name} · ${members.length} pessoas`
            : `Um resumo de ${formatMonthKey(month)}`
        }
        action={<MonthPicker month={month} />}
      />

      {isEmpty ? (
        <Card>
          <EmptyState
            icon={<Wallet className="h-6 w-6" aria-hidden />}
            title="Vamos começar pelo primeiro lançamento"
            description="Registre uma despesa ou receita e o painel se preenche sozinho — saldos, gráficos e categorias."
            action={
              <Link href={{ pathname: '/lancamentos/novo', query: { space: space.id } }}>
                <Button size="lg">
                  <Plus className="h-4 w-4" aria-hidden />
                  Registrar lançamento
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {/* ---------------------------------------------------- indicadores */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Receitas do mês"
              cents={summary.incomeCents}
              previousCents={previousSummary.incomeCents}
              currency={currency}
              tone="income"
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
            />
            <StatCard
              label="Despesas do mês"
              cents={summary.expenseCents}
              previousCents={previousSummary.expenseCents}
              currency={currency}
              tone="expense"
              invertDelta
              icon={<TrendingDown className="h-4 w-4" aria-hidden />}
            />
            <StatCard
              label="Sobrou no mês"
              cents={summary.balanceCents}
              currency={currency}
              tone="auto"
              hint={
                summary.balanceCents >= 0
                  ? 'Receitas menos despesas'
                  : 'Você gastou mais do que recebeu'
              }
            />
            <StatCard
              label="Saldo total"
              cents={netWorth.totalCents}
              currency={currency}
              tone="auto"
              hint={`${accounts.length} conta${accounts.length > 1 ? 's' : ''} ativa${accounts.length > 1 ? 's' : ''}`}
              icon={<Wallet className="h-4 w-4" aria-hidden />}
            />
          </div>

          {/* ------------------------------------------------ acerto do casal */}
          {settlement && (
            <SettlementCallout settlement={settlement} currency={currency} spaceId={space.id} />
          )}

          {/*
            `items-start` impede que o cartão do gráfico seja esticado até a
            altura do de categorias — sem isso, sobrava um vazio enorme (ou o
            gráfico crescia demais, exagerando o trecho sem dados).
          */}
          <div className="grid items-start gap-5 lg:grid-cols-3">
            {/* ------------------------------------------------- evolução */}
            <Card className="lg:col-span-2">
              <CardHeader
                title="Últimos 6 meses"
                description="Receitas e despesas lado a lado"
              />
              <CardBody className="pt-2">
                <TrendChart data={trend} currency={currency} />
              </CardBody>
            </Card>

            {/* ------------------------------------------------ categorias */}
            <Card>
              <CardHeader
                title="Onde foi o dinheiro"
                description={formatMonthKey(month)}
              />
              <CardBody className="pt-2">
                {breakdown.length > 0 && (
                  <div className="mb-4">
                    <CategoryDonut
                      data={breakdown.slice(0, 8).map((b) => ({
                        name: b.name,
                        amountCents: b.amountCents,
                        color: b.color,
                      }))}
                      currency={currency}
                    />
                  </div>
                )}
                <CategoryList
                  items={breakdown}
                  currency={currency}
                  spaceId={space.id}
                  month={month}
                />
              </CardBody>
            </Card>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-3">
            {/* -------------------------------------------- últimos lançamentos */}
            <Card className="lg:col-span-2">
              <CardHeader
                title="Últimos lançamentos"
                action={
                  <Link
                    href={{ pathname: '/lancamentos', query: { space: space.id, mes: month } }}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    Ver todos
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                }
              />
              <CardBody className="pt-3">
                {recent.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">
                    Nada registrado ainda.
                  </p>
                ) : (
                  <TransactionList
                    transactions={recent}
                    currency={currency}
                    spaceId={space.id}
                    showSplit={isShared}
                  />
                )}
              </CardBody>
            </Card>

            <div className="space-y-5">
              {/* ------------------------------------------------ orçamentos */}
              <Card>
                <CardHeader
                  title="Orçamentos"
                  action={
                    <Link
                      href={{ pathname: '/orcamentos', query: { space: space.id, mes: month } }}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      Gerenciar
                    </Link>
                  }
                />
                <CardBody className="pt-3">
                  {budgets.length === 0 ? (
                    <p className="text-sm text-muted">
                      Defina limites por categoria para saber antes do fim do mês se o
                      dinheiro vai apertar.
                    </p>
                  ) : (
                    <ul className="space-y-3.5">
                      {budgets.slice(0, 5).map((budget) => (
                        <li key={budget.categoryId}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm text-fg">{budget.categoryName}</span>
                            <span className="tabular shrink-0 text-xs text-muted">
                              {budget.percent.toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={budget.percent}
                            showOverflow
                            tone={budget.status === 'atencao' ? 'warning' : 'brand'}
                          />
                          <p className="mt-1 text-2xs text-muted">
                            <Money
                              cents={budget.spentCents}
                              currency={currency}
                              tone="muted"
                              size="xs"
                            />{' '}
                            de{' '}
                            <Money
                              cents={budget.limitCents}
                              currency={currency}
                              tone="muted"
                              size="xs"
                            />
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>

              {/* ---------------------------------------------------- contas */}
              <Card>
                <CardHeader
                  title="Contas"
                  action={
                    <Link
                      href={{ pathname: '/contas', query: { space: space.id } }}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      Gerenciar
                    </Link>
                  }
                />
                <CardBody className="pt-3">
                  <ul className="space-y-2.5">
                    {accounts.slice(0, 6).map((account) => (
                      <li key={account.id} className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: account.color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-fg">{account.name}</span>
                          <span className="block text-2xs text-muted">
                            {ACCOUNT_TYPE_LABELS[
                              account.type as keyof typeof ACCOUNT_TYPE_LABELS
                            ] ?? account.type}
                          </span>
                        </span>
                        <Money
                          cents={account.balanceCents}
                          currency={currency}
                          tone={account.balanceCents < 0 ? 'expense' : 'neutral'}
                          size="sm"
                        />
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
