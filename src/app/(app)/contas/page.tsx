import type { Metadata } from 'next';
import { Wallet } from 'lucide-react';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { getAccountBalances, getNetWorth } from '@/server/queries/accounts';
import { PageHeader } from '@/components/app/page-header';
import { AccountForm } from '@/components/catalog/account-form';
import { AccountList } from '@/components/catalog/account-list';
import { Card, EmptyState } from '@/components/ui/card';
import { Money } from '@/components/ui/money';

export const metadata: Metadata = { title: 'Contas' };

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space, members } = context;

  const [accounts, netWorth] = await Promise.all([
    getAccountBalances(space.id, { includeArchived: true }),
    getNetWorth(space.id),
  ]);

  const memberOptions = members.map((m) => ({ id: m.id, displayName: m.displayName }));
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);

  return (
    <>
      <PageHeader
        title="Contas"
        description="Onde o dinheiro fica: conta corrente, dinheiro vivo, cartão, investimento."
        action={<AccountForm spaceId={space.id} members={memberOptions} />}
      />

      {accounts.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-sm text-muted">Saldo total</p>
            <Money cents={netWorth.totalCents} currency={space.currency} tone="auto" size="lg" />
          </div>
          <div className="card p-4">
            <p className="text-sm text-muted">O que vocês têm</p>
            <Money cents={netWorth.assetsCents} currency={space.currency} tone="income" size="lg" />
          </div>
          <div className="card p-4">
            <p className="text-sm text-muted">O que vocês devem</p>
            <Money
              cents={netWorth.liabilitiesCents}
              currency={space.currency}
              tone="expense"
              size="lg"
            />
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="h-6 w-6" aria-hidden />}
            title="Nenhuma conta cadastrada"
            description="Crie ao menos uma conta para começar a registrar lançamentos."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <AccountList
            accounts={active}
            spaceId={space.id}
            currency={space.currency}
            members={memberOptions}
          />

          {archived.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted">Arquivadas</h2>
              <AccountList
                accounts={archived}
                spaceId={space.id}
                currency={space.currency}
                members={memberOptions}
              />
            </section>
          )}
        </div>
      )}
    </>
  );
}
