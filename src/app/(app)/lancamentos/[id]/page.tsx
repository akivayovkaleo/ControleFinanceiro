import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { getSpaceCatalog } from '@/server/queries/catalog';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { TransactionActions } from '@/components/transactions/transaction-actions';
import { Card, CardBody } from '@/components/ui/card';
import { toDateInput } from '@/lib/date';
import type { SplitMode } from '@/lib/split';

export const metadata: Metadata = { title: 'Editar lançamento' };

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const context = await getActiveSpace(search);
  const { space, members, isShared } = context;

  // O filtro por spaceId é o que impede abrir um lançamento de outro espaço.
  const transaction = await db.transaction.findFirst({
    where: { id, spaceId: space.id },
    include: { shares: true },
  });
  if (!transaction) notFound();

  const { accounts, categories } = await getSpaceCatalog(space.id);

  const shares = Object.fromEntries(
    transaction.shares.map((s) => [s.membershipId, s.amountCents]),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={{ pathname: '/lancamentos', query: { space: space.id } }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
          Editar lançamento
        </h1>
        <TransactionActions
          spaceId={space.id}
          transactionId={transaction.id}
          locked={Boolean(transaction.settlementId)}
        />
      </div>

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
            locked={Boolean(transaction.settlementId)}
            initial={{
              id: transaction.id,
              type: transaction.type,
              amount: (transaction.amountCents / 100).toFixed(2).replace('.', ','),
              date: toDateInput(transaction.date),
              description: transaction.description,
              notes: transaction.notes ?? '',
              accountId: transaction.accountId,
              toAccountId: transaction.toAccountId ?? '',
              categoryId: transaction.categoryId ?? '',
              paidByMembershipId: transaction.paidByMembershipId ?? '',
              splitMode: transaction.splitMode as SplitMode,
              shares,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
