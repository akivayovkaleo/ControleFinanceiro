'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCents, formatCentsCompact } from '@/lib/money';

interface TooltipPayloadItem {
  name?: string;
  dataKey?: string | number;
  value?: number | string;
  color?: string;
}

const SERIES_LABEL: Record<string, string> = {
  netCents: 'Patrimônio',
  investedCents: 'Investido',
};

function NetWorthTooltip({
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
        <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      )}
      {payload.map((item, index) => (
        <p key={index} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="text-muted">
            {SERIES_LABEL[String(item.dataKey ?? '')] ?? item.name}
          </span>
          <span className="tabular ml-auto font-semibold text-fg">
            {formatCents(Number(item.value ?? 0), currency)}
          </span>
        </p>
      ))}
    </div>
  );
}

export interface NetWorthPointView {
  /** ISO do dia da fotografia. */
  day: string;
  label: string;
  netCents: number;
  investedCents: number;
}

/**
 * Evolução do patrimônio.
 *
 * Área única, e não receitas-versus-despesas: aqui a pergunta é "estou
 * construindo patrimônio?", que é uma linha só subindo ou descendo. A camada
 * de investido aparece por baixo para mostrar quanto do patrimônio está
 * aplicado — a diferença entre guardar e investir.
 *
 * A cor é `--brand` porque este número não é receita nem despesa: é o
 * resultado, e as cores de estado são reservadas (regra 5 do CLAUDE.md).
 * Aqui `--brand` não está num gráfico de categorias disputando significado com
 * receita/despesa; é a única série do gráfico.
 */
export function NetWorthChart({
  data,
  currency,
}: {
  data: NetWorthPointView[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220} minHeight={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.28} />
            <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatCentsCompact(value, currency)}
          width={68}
        />

        {/* Tooltip próprio, como nos gráficos do painel: o `formatter` do
            recharts entrega `value` possivelmente indefinido e obriga a um
            cast que esconde erro de verdade. */}
        <Tooltip content={<NetWorthTooltip currency={currency} />} />

        <Area
          type="monotone"
          dataKey="netCents"
          stroke="hsl(var(--brand))"
          strokeWidth={2}
          fill="url(#fillNet)"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="investedCents"
          stroke="hsl(var(--muted))"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="none"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
