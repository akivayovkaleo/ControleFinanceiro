import { formatDate } from '@/lib/date';
import { groupBy } from '@/lib/utils';
import { Money } from '@/components/ui/money';
import { TransactionRow, type TransactionRowData } from './transaction-row';

/**
 * Extrato agrupado por dia.
 *
 * O total do dia no cabeçalho de cada grupo responde "quanto saiu hoje?" sem
 * exigir soma mental — que é a primeira coisa que alguém quer saber ao abrir
 * o extrato. Transferências ficam de fora desse total: elas não representam
 * dinheiro entrando ou saindo do bolso do casal.
 */
export function TransactionList({
  transactions,
  currency,
  spaceId,
  showSplit,
}: {
  transactions: TransactionRowData[];
  currency: string;
  spaceId: string;
  showSplit: boolean;
}) {
  const groups = groupBy(transactions, (t) => t.date.toISOString().slice(0, 10));

  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([day, items]) => {
        const dayTotal = items.reduce((acc, t) => {
          if (t.type === 'INCOME') return acc + t.amountCents;
          if (t.type === 'EXPENSE') return acc - t.amountCents;
          return acc;
        }, 0);

        return (
          <section key={day}>
            <header className="mb-1 flex items-baseline justify-between gap-3 px-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {formatDate(items[0]!.date)}
              </h3>
              <Money cents={dayTotal} currency={currency} signed size="xs" tone="auto" />
            </header>

            <ul className="-mx-2">
              {items.map((transaction) => (
                <li key={transaction.id}>
                  <TransactionRow
                    transaction={transaction}
                    currency={currency}
                    spaceId={spaceId}
                    showSplit={showSplit}
                    showDate={false}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
