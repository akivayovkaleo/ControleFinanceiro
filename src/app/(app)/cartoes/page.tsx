import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { getCards } from '@/server/queries/cards';
import { formatDate } from '@/lib/date';
import { PageHeader } from '@/components/app/page-header';
import { Card, EmptyState } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Cartões' };

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { space } = await getActiveSpace(params);
  const cards = await getCards(space.id);

  return (
    <>
      <PageHeader
        title="Cartões"
        description="A fatura de cada cartão, quanto do limite já foi usado e quando vence."
      />

      {cards.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CreditCard className="h-6 w-6" aria-hidden />}
            title="Nenhum cartão cadastrado"
            description="Cadastre uma conta do tipo cartão de crédito, com o dia de fechamento e o de vencimento, e a fatura aparece aqui."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => {
            const ratio = card.limit.ratio === null ? null : card.limit.ratio * 100;

            return (
              <Link
                key={card.accountId}
                href={`/cartoes/${card.accountId}`}
                className="card block p-4 transition-colors hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-8 w-8 shrink-0 rounded-lg"
                      style={{ backgroundColor: card.color }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{card.name}</p>
                      <p className="text-xs text-muted">
                        Vence {formatDate(card.dueDate, { withYear: false })}
                      </p>
                    </div>
                  </div>
                  {card.limit.overLimit && <Badge tone="danger">Limite estourado</Badge>}
                </div>

                <div className="mt-3">
                  <p className="text-xs text-muted">Fatura aberta</p>
                  <Money
                    cents={card.currentTotalCents}
                    currency={space.currency}
                    tone="neutral"
                    size="lg"
                  />
                </div>

                {ratio !== null && (
                  <div className="mt-3">
                    <Progress
                      value={ratio}
                      tone={ratio >= 90 ? 'danger' : ratio >= 70 ? 'warning' : 'brand'}
                    />
                    <p className="mt-1.5 flex justify-between text-xs text-muted">
                      <span>
                        <Money cents={card.limit.usedCents} currency={space.currency} size="xs" />{' '}
                        usados
                      </span>
                      <span>
                        <Money
                          cents={card.limit.availableCents ?? 0}
                          currency={space.currency}
                          size="xs"
                        />{' '}
                        livres
                      </span>
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
