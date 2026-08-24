import type { Metadata } from 'next';
import { Target } from 'lucide-react';
import { db } from '@/lib/db';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { PageHeader } from '@/components/app/page-header';
import { GoalCard, type GoalView } from '@/components/planning/goal-card';
import { GoalForm } from '@/components/planning/goal-form';
import { Card, EmptyState } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Metas' };

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space } = context;

  const goals = await db.goal.findMany({
    where: { spaceId: space.id, archived: false },
    orderBy: { createdAt: 'asc' },
    include: { contributions: { select: { amountCents: true } } },
  });

  const views: GoalView[] = goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    targetCents: goal.targetCents,
    savedCents: goal.contributions.reduce((acc, c) => acc + c.amountCents, 0),
    targetDate: goal.targetDate,
    color: goal.color,
  }));

  return (
    <>
      <PageHeader
        title="Metas"
        description="Um lugar para juntar dinheiro com propósito — viagem, reserva, casa nova."
        action={<GoalForm spaceId={space.id} />}
      />

      {views.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Target className="h-6 w-6" aria-hidden />}
            title="Nenhuma meta ainda"
            description="Metas ajudam a transformar “um dia a gente viaja” em um número e um prazo."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {views.map((goal) => (
            <GoalCard key={goal.id} goal={goal} spaceId={space.id} currency={space.currency} />
          ))}
        </div>
      )}
    </>
  );
}
