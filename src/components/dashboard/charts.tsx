'use client';

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCents, formatCentsCompact } from '@/lib/money';
import { formatMonthKeyShort } from '@/lib/date';
import { cn } from '@/lib/utils';

/**
 * Gráficos do painel.
 *
 * Decisões de leitura:
 *  - Sem legenda flutuante: os rótulos ficam ao lado do gráfico, na lista, que
 *    é onde a pessoa realmente compara valores.
 *  - Eixo Y em notação compacta ("R$ 3,5 mil"), senão os números competem com
 *    o gráfico pelo espaço.
 *  - As cores vêm dos dados (cor da categoria), não de uma paleta fixa, para
 *    que gráfico e lista concordem visualmente.
 *  - `isAnimationActive={false}`: a animação de entrada do Recharts leva ~1,5s
 *    partindo do zero, o que deixa o gráfico VAZIO no primeiro segundo. Num
 *    painel financeiro isso é o oposto do que se quer — os números precisam
 *    estar lá quando a tela aparece.
 */

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 shadow-pop">
      {label !== undefined && (
        <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted">
          {typeof label === 'string' ? formatMonthKeyShort(label) : label}
        </p>
      )}
      {payload.map((item, index) => (
        <p key={index} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="text-muted">{item.name}</span>
          <span className="tabular ml-auto font-semibold text-fg">
            {formatCents(Number(item.value ?? 0), currency)}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Legenda.
 *
 * Duas séries no mesmo gráfico exigem legenda: sem ela, a identidade de cada
 * linha depende só da cor — e ~8% dos homens não distinguem verde de
 * vermelho, que é exatamente o par usado aqui. Fica acima do gráfico, onde é
 * lida antes dos dados, e não flutuando por cima deles.
 */
function Legend({ items }: { items: Array<{ label: string; className: string }> }) {
  return (
    <ul className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={cn('h-0.5 w-3.5 rounded-full', item.className)} aria-hidden />
          <span className="text-2xs font-medium text-muted">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function TrendChart({
  data,
  currency,
  fill = false,
}: {
  data: Array<{ month: string; incomeCents: number; expenseCents: number }>;
  currency: string;
  /** Ocupa toda a altura do contêiner em vez de uma altura fixa. */
  fill?: boolean;
}) {
  return (
    <>
    <Legend
      items={[
        { label: 'Receitas', className: 'bg-income' },
        { label: 'Despesas', className: 'bg-expense' },
      ]}
    />
    <ResponsiveContainer width="100%" height={fill ? '100%' : 200} minHeight={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--income))" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(var(--income))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--expense))" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(var(--expense))" stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="month"
          tickFormatter={formatMonthKeyShort}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10.5, fill: 'hsl(var(--subtle))' }}
          dy={8}
          minTickGap={4}
        />
        <YAxis
          tickFormatter={(value: number) => formatCentsCompact(value, currency)}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10.5, fill: 'hsl(var(--subtle))' }}
          // Largura folgada: com 62px o "R$" de "R$ 13,5 mil" era cortado.
          width={74}
          tickCount={4}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: 'hsl(var(--border-strong))', strokeDasharray: '3 3' }} />

        <Area
          type="monotone"
          dataKey="incomeCents"
          name="Receitas"
          stroke="hsl(var(--income))"
          strokeWidth={2}
          fill="url(#fillIncome)"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="expenseCents"
          name="Despesas"
          stroke="hsl(var(--expense))"
          strokeWidth={2}
          fill="url(#fillExpense)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
    </>
  );
}

export function CategoryDonut({
  data,
  currency,
}: {
  data: Array<{ name: string; amountCents: number; color: string }>;
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amountCents"
          nameKey="name"
          innerRadius={56}
          outerRadius={86}
          paddingAngle={1.5}
          // Anel na cor da superfície entre as fatias: o vão de 2px é o que
          // impede duas cores vizinhas de se fundirem numa mancha só.
          stroke="hsl(var(--surface))"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip currency={currency} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
