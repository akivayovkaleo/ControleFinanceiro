import type { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { getAccountBalances, getNetWorth } from '@/server/queries/accounts';
import { getPortfolio, getUninvestedCash } from '@/server/queries/investments';
import { PageHeader } from '@/components/app/page-header';
import { HoldingForm } from '@/components/investments/holding-form';
import { HoldingList, type HoldingRow } from '@/components/investments/holding-list';
import { CaptureSnapshot } from '@/components/investments/capture-snapshot';
import { Card, EmptyState } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Money } from '@/components/ui/money';

export const metadata: Metadata = { title: 'Investimentos' };

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { space } = await getActiveSpace(params);

  const [portfolio, netWorth, accounts, uninvested] = await Promise.all([
    getPortfolio(space.id),
    getNetWorth(space.id),
    getAccountBalances(space.id),
    getUninvestedCash(space.id),
  ]);

  const accountOptions = accounts.map((account) => ({ id: account.id, name: account.name }));

  const rows: HoldingRow[] = portfolio.holdings.map((holding) => ({
    id: holding.id,
    name: holding.name,
    ticker: holding.ticker,
    type: holding.type,
    quantity: holding.quantity,
    avgPriceCents: holding.avgPriceCents,
    currentPriceCents: holding.currentPriceCents,
    marketValueCents: holding.marketValueCents,
    costBasisCents: holding.costBasisCents,
    gainCents: holding.gainCents,
    gainPercent: holding.gainPercent,
    accountId: holding.accountId,
    accountName: holding.accountName,
    notes: null,
  }));

  const gainTone =
    portfolio.gainCents > 0 ? 'income' : portfolio.gainCents < 0 ? 'expense' : 'muted';

  return (
    <>
      <PageHeader
        title="Investimentos"
        description="O que já está aplicado, quanto rendeu e quanto isso soma ao patrimônio."
        action={
          accountOptions.length > 0 ? (
            <HoldingForm spaceId={space.id} accounts={accountOptions} />
          ) : undefined
        }
      />

      {accountOptions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TrendingUp className="h-6 w-6" aria-hidden />}
            title="Crie uma conta primeiro"
            description="Toda posição fica guardada em algum lugar — uma corretora, um banco. Cadastre a conta e volte aqui."
          />
        </Card>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-4">
              <p className="text-sm text-muted">Patrimônio líquido</p>
              <Money cents={netWorth.totalCents} currency={space.currency} tone="auto" size="lg" />
              <p className="mt-1 text-xs text-muted">Contas + carteira − dívidas</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted">Investido</p>
              <Money
                cents={portfolio.marketValueCents}
                currency={space.currency}
                tone="neutral"
                size="lg"
              />
              <p className="mt-1 text-xs text-muted">
                {portfolio.holdings.length}{' '}
                {portfolio.holdings.length === 1 ? 'posição' : 'posições'} ·{' '}
                {portfolio.distinctTypes}{' '}
                {portfolio.distinctTypes === 1 ? 'tipo' : 'tipos'}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted">Resultado</p>
              <Money
                cents={portfolio.gainCents}
                currency={space.currency}
                tone={gainTone}
                size="lg"
                signed
              />
              <p className="mt-1 text-xs text-muted">
                {portfolio.gainPercent === null
                  ? 'Sem custo registrado'
                  : `${portfolio.gainPercent >= 0 ? '+' : ''}${portfolio.gainPercent
                      .toFixed(2)
                      .replace('.', ',')}% sobre o que foi pago`}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted">Dinheiro em conta</p>
              <Money
                cents={netWorth.cashCents}
                currency={space.currency}
                tone="neutral"
                size="lg"
              />
              <p className="mt-1 text-xs text-muted">Fora da carteira</p>
            </div>
          </div>

          {uninvested.length > 0 && (
            <Alert tone="warning" className="mb-5">
              <p className="font-medium">Tem dinheiro parado na corretora.</p>
              <p className="mt-1 text-sm">
                {uninvested.map((account) => account.accountName).join(', ')} —{' '}
                <Money
                  cents={uninvested.reduce((acc, a) => acc + a.balanceCents, 0)}
                  currency={space.currency}
                  size="xs"
                />
                . O saldo de uma conta de investimento é o que ainda não foi aplicado. Se você já
                comprou, registre o lançamento de compra tirando o dinheiro da conta — senão o
                mesmo dinheiro conta duas vezes no patrimônio.
              </p>
            </Alert>
          )}

          {portfolio.allocation.length > 0 && (
            <div className="card mb-5 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-fg">Onde está aplicado</h2>
                <CaptureSnapshot spaceId={space.id} />
              </div>

              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
                role="img"
                aria-label="Distribuição da carteira por tipo"
              >
                {portfolio.allocation.map((slice) => (
                  <span
                    key={slice.type}
                    style={{ width: `${slice.percent}%`, backgroundColor: slice.color }}
                    title={`${slice.label}: ${slice.percent.toFixed(1)}%`}
                  />
                ))}
              </div>

              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {portfolio.allocation.map((slice) => (
                  <li key={slice.type} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: slice.color }}
                        aria-hidden
                      />
                      <span className="truncate text-muted">{slice.label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {slice.percent.toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={<TrendingUp className="h-6 w-6" aria-hidden />}
                title="A carteira está vazia"
                description="Cadastre o que você já tem aplicado. O patrimônio passa a somar a carteira, e a evolução começa a ser registrada."
              />
            </Card>
          ) : (
            <HoldingList
              holdings={rows}
              spaceId={space.id}
              currency={space.currency}
              accounts={accountOptions}
            />
          )}
        </>
      )}
    </>
  );
}
