import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { firstParam, getActiveSpace, type SearchParams } from '@/lib/space-context';
import { getCard } from '@/server/queries/cards';
import { closeKey, type Statement } from '@/lib/credit-card';
import { formatDate, formatDateShort } from '@/lib/date';
import { installmentLabel } from '@/lib/installments';
import { PageHeader } from '@/components/app/page-header';
import { Card, EmptyState } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Fatura' };

const STATUS_LABEL = {
  open: 'Aberta',
  closed: 'A pagar',
  paid: 'Paga',
} as const;

const STATUS_TONE = {
  open: 'brand',
  closed: 'warning',
  paid: 'income',
} as const;

export default async function CardStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const { space } = await getActiveSpace(search);

  const card = await getCard(space.id, id);
  if (!card) notFound();

  // Abre na fatura corrente: é a que a pessoa veio ver.
  const selectedKey = firstParam(search, 'fatura') ?? card.currentCloseKey;
  const selected =
    card.statements.find((s) => closeKey(s.cycle.closeDate) === selectedKey) ??
    card.statements.find((s) => closeKey(s.cycle.closeDate) === card.currentCloseKey) ??
    card.statements[card.statements.length - 1];

  const ratio = card.limit.ratio === null ? null : card.limit.ratio * 100;

  return (
    <>
      <PageHeader
        title={card.name}
        description={`Fecha todo dia ${card.config.closingDay} e vence dia ${card.config.dueDay}.`}
        action={
          <Link
            href="/cartoes"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Cartões
          </Link>
        }
      />

      {ratio !== null && (
        <div className="card mb-5 p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted">Limite</p>
            {card.limit.overLimit && <Badge tone="danger">Estourado</Badge>}
          </div>
          <Progress
            value={ratio}
            tone={ratio >= 90 ? 'danger' : ratio >= 70 ? 'warning' : 'brand'}
          />
          <p className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
            <span>
              <Money cents={card.limit.usedCents} currency={space.currency} size="xs" /> de{' '}
              <Money cents={card.limit.limitCents ?? 0} currency={space.currency} size="xs" /> usados
            </span>
            <span>
              <Money
                cents={card.limit.availableCents ?? 0}
                currency={space.currency}
                size="xs"
                tone={card.limit.overLimit ? 'expense' : 'income'}
              />{' '}
              disponíveis
            </span>
          </p>
        </div>
      )}

      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Faturas">
        {card.statements.map((statement) => {
          const key = closeKey(statement.cycle.closeDate);
          const isSelected = selected && key === closeKey(selected.cycle.closeDate);

          return (
            <Link
              key={key}
              href={`/cartoes/${card.accountId}?fatura=${key}`}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs transition-colors ${
                isSelected
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-border text-muted hover:border-brand/40 hover:text-fg'
              }`}
              aria-current={isSelected ? 'page' : undefined}
            >
              <span className="block font-semibold">
                {formatDate(statement.cycle.closeDate, { withYear: false })}
              </span>
              <span className="block">
                <Money cents={statement.totalCents} currency={space.currency} size="xs" />
              </span>
            </Link>
          );
        })}
      </nav>

      {selected ? (
        <StatementPanel statement={selected} currency={space.currency} />
      ) : (
        <Card>
          <EmptyState
            icon={<CreditCard className="h-6 w-6" aria-hidden />}
            title="Nenhuma fatura ainda"
            description="Assim que houver uma compra neste cartão, a fatura dela aparece aqui."
          />
        </Card>
      )}
    </>
  );
}

function StatementPanel({ statement, currency }: { statement: Statement; currency: string }) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-fg">
              Fatura de {formatDate(statement.cycle.closeDate)}
            </h2>
            <Badge tone={STATUS_TONE[statement.status]}>{STATUS_LABEL[statement.status]}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatDateShort(statement.cycle.start)} a {formatDateShort(statement.cycle.end)} · vence{' '}
            {formatDate(statement.cycle.dueDate)}
          </p>
        </div>

        <div className="text-right">
          <Money cents={statement.totalCents} currency={currency} size="lg" tone="neutral" />
          {statement.paidCents > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              <Money cents={statement.paidCents} currency={currency} size="xs" tone="income" /> pagos
              {statement.outstandingCents > 0 && (
                <>
                  {' · '}
                  <Money
                    cents={statement.outstandingCents}
                    currency={currency}
                    size="xs"
                    tone="expense"
                  />{' '}
                  em aberto
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {statement.entries.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">
          Nenhuma compra nesta fatura.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {statement.entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.categoryColor ?? 'hsl(var(--muted))' }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">
                    {entry.description}
                    {entry.installmentNumber !== null && entry.installmentTotal !== null && (
                      <span className="ml-2 text-xs font-semibold text-muted">
                        {installmentLabel(entry.installmentNumber, entry.installmentTotal)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateShort(entry.date)}
                    {entry.categoryName && ` · ${entry.categoryName}`}
                  </p>
                </div>
              </div>

              <Money
                cents={entry.amountCents}
                currency={currency}
                size="sm"
                tone={entry.direction === 'credit' ? 'income' : 'neutral'}
                signed={entry.direction === 'credit'}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
