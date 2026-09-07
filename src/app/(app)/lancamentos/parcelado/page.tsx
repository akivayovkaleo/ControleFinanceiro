import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { PageHeader } from '@/components/app/page-header';
import { InstallmentForm } from '@/components/transactions/installment-form';

export const metadata: Metadata = { title: 'Compra parcelada' };

export default async function InstallmentPurchasePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { space, members } = await getActiveSpace(params);

  const [accounts, categories] = await Promise.all([
    db.account.findMany({
      where: { spaceId: space.id, archived: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        statementDay: true,
        dueDay: true,
        statementInclusive: true,
      },
    }),
    db.category.findMany({
      where: { spaceId: space.id, kind: 'EXPENSE', archived: false },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Compra parcelada"
        description="Cada parcela vira um lançamento próprio, no mês em que ela cai — é assim que o saldo e o orçamento enxergam o valor certo."
        action={
          <Link
            href="/lancamentos"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Lançamentos
          </Link>
        }
      />

      <InstallmentForm
        spaceId={space.id}
        currency={space.currency}
        accounts={accounts.map((account) => ({
          id: account.id,
          name: account.name,
          isCreditCard: account.type === 'CREDIT_CARD',
          statementDay: account.statementDay,
          dueDay: account.dueDay,
          statementInclusive: account.statementInclusive,
        }))}
        categories={categories}
        members={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
      />
    </>
  );
}
