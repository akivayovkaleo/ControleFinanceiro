import type { Metadata } from 'next';
import { Repeat } from 'lucide-react';
import { db } from '@/lib/db';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { getSpaceCatalog } from '@/server/queries/catalog';
import { PageHeader } from '@/components/app/page-header';
import { RecurrenceForm } from '@/components/recurrences/recurrence-form';
import { RecurrenceList, type RecurrenceItem } from '@/components/recurrences/recurrence-list';
import { RunRecurrences } from '@/components/recurrences/run-recurrences';
import { Card, EmptyState } from '@/components/ui/card';
import type { Frequency } from '@/lib/date';

export const metadata: Metadata = { title: 'Recorrências' };

export default async function RecurrencesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space, members, isShared } = context;

  const [recurrences, catalog] = await Promise.all([
    db.recurrence.findMany({
      where: { spaceId: space.id },
      orderBy: [{ active: 'desc' }, { nextRunAt: 'asc' }],
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
        _count: { select: { transactions: true } },
      },
    }),
    getSpaceCatalog(space.id),
  ]);

  const items: RecurrenceItem[] = recurrences.map((r) => ({
    id: r.id,
    type: r.type,
    amountCents: r.amountCents,
    description: r.description,
    frequency: r.frequency as Frequency,
    nextRunAt: r.nextRunAt,
    endsAt: r.endsAt,
    active: r.active,
    accountName: r.account.name,
    categoryName: r.category?.name ?? null,
    generatedCount: r._count.transactions,
  }));

  return (
    <>
      <PageHeader
        title="Recorrências"
        description="Aluguel, salário, assinaturas — o que se repete todo mês, lançado sozinho."
        action={
          <div className="flex items-center gap-2">
            <RunRecurrences spaceId={space.id} />
            <RecurrenceForm
              spaceId={space.id}
              accounts={catalog.accounts}
              categories={catalog.categories}
              members={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
              isShared={isShared}
            />
          </div>
        }
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Repeat className="h-6 w-6" aria-hidden />}
            title="Nenhuma recorrência"
            description="Cadastre o que se repete e pare de lançar aluguel na mão todo mês."
          />
        </Card>
      ) : (
        <RecurrenceList
          recurrences={items}
          spaceId={space.id}
          currency={space.currency}
        />
      )}

      <p className="mt-5 text-xs leading-relaxed text-muted">
        Os lançamentos são gerados quando alguém abre o app — não é preciso deixar nada
        rodando em segundo plano. Depois de gerados, viram lançamentos comuns e podem ser
        editados ou excluídos um a um.
      </p>
    </>
  );
}
