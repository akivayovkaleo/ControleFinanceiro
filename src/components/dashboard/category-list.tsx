import Link from 'next/link';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/card';
import { PieChart } from 'lucide-react';
import type { CategoryBreakdownItem } from '@/server/queries/dashboard';

/**
 * Lista de categorias com barra proporcional.
 *
 * A barra é o mesmo dado do gráfico de rosca, mas legível: o donut mostra a
 * proporção de relance, a lista mostra o valor exato. As duas juntas cobrem
 * "quanto foi" e "quanto isso representa" sem obrigar a passar o mouse.
 */
export function CategoryList({
  items,
  currency,
  spaceId,
  month,
  limit = 6,
}: {
  items: CategoryBreakdownItem[];
  currency: string;
  spaceId: string;
  month: string;
  limit?: number;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<PieChart className="h-6 w-6" aria-hidden />}
        title="Nenhuma despesa neste mês"
        description="Assim que você registrar gastos, eles aparecem aqui divididos por categoria."
      />
    );
  }

  const shown = items.slice(0, limit);
  const rest = items.slice(limit);
  const restTotal = rest.reduce((acc, item) => acc + item.amountCents, 0);

  return (
    <ul className="space-y-3">
      {shown.map((item) => (
        <li key={item.categoryId ?? 'sem-categoria'}>
          <Link
            href={{
              pathname: '/lancamentos',
              query: {
                space: spaceId,
                mes: month,
                ...(item.categoryId ? { categoria: item.categoryId } : {}),
              },
            }}
            className="group block"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="truncate text-sm text-fg group-hover:underline">{item.name}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="tabular text-2xs text-muted">{item.percent.toFixed(0)}%</span>
                <Money cents={item.amountCents} currency={currency} tone="neutral" size="sm" />
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(item.percent, 1.5)}%`, backgroundColor: item.color }}
              />
            </div>
          </Link>
        </li>
      ))}

      {rest.length > 0 && (
        <li className="flex items-baseline justify-between gap-3 pt-1 text-sm">
          <span className="text-muted">
            + {rest.length} outra{rest.length > 1 ? 's' : ''} categoria{rest.length > 1 ? 's' : ''}
          </span>
          <Money cents={restTotal} currency={currency} tone="muted" size="sm" />
        </li>
      )}
    </ul>
  );
}
