import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { getSpaceCatalog } from '@/server/queries/catalog';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { Card, CardBody, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Novo lançamento' };

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space, members, isShared } = context;

  const { accounts, categories } = await getSpaceCatalog(space.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={{ pathname: '/lancamentos', query: { space: space.id } }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar
      </Link>

      <h1 className="mb-5 text-xl font-semibold tracking-tight text-fg sm:text-2xl">
        Novo lançamento
      </h1>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            title="Você precisa de uma conta primeiro"
            description="Uma conta é de onde o dinheiro sai ou para onde ele entra: conta corrente, dinheiro, cartão."
            action={
              <Link href={{ pathname: '/contas', query: { space: space.id } }}>
                <Button>Criar uma conta</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card>
          <CardBody>
            <TransactionForm
              spaceId={space.id}
              currency={space.currency}
              accounts={accounts}
              categories={categories}
              members={members.map((m) => ({
                id: m.id,
                displayName: m.displayName,
                color: m.color,
                monthlyIncomeCents: m.monthlyIncomeCents,
              }))}
              isShared={isShared}
              initial={{ paidByMembershipId: context.membership.id }}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
