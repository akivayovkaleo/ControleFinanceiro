/**
 * Carteira de investimentos e patrimônio líquido.
 *
 * ONDE ESTÁ O DINHEIRO, PARA NÃO CONTÁ-LO DUAS VEZES: o saldo de uma conta de
 * investimento é o dinheiro **ainda por aplicar**; as posições (`Holding`) são a
 * parte **já aplicada**. Comprar uma posição tem que sair do saldo da conta —
 * se o lançamento de compra não for feito, o mesmo dinheiro aparece nos dois
 * lugares e o patrimônio fica inflado. A tela avisa quando isso acontece.
 *
 * Camada pura: recebe posições já filtradas por space e devolve números.
 */

import type { Cents } from './money';
import { PALETTE } from './presets';

// ---------------------------------------------------------------------------
// Tipos de posição
// ---------------------------------------------------------------------------

export type HoldingType =
  | 'STOCK'
  | 'REIT'
  | 'FIXED_INCOME'
  | 'TREASURY'
  | 'CRYPTO'
  | 'FUND'
  | 'OTHER';

export const HOLDING_TYPES: readonly HoldingType[] = [
  'STOCK',
  'REIT',
  'FIXED_INCOME',
  'TREASURY',
  'CRYPTO',
  'FUND',
  'OTHER',
] as const;

export const HOLDING_TYPE_LABELS: Record<HoldingType, string> = {
  STOCK: 'Ações',
  REIT: 'Fundos imobiliários',
  FIXED_INCOME: 'Renda fixa',
  TREASURY: 'Tesouro Direto',
  CRYPTO: 'Cripto',
  FUND: 'Fundos',
  OTHER: 'Outros',
};

/** Nomes de ícone do lucide-react, como no resto do app (ver presets.ts). */
export const HOLDING_TYPE_ICONS: Record<HoldingType, string> = {
  STOCK: 'trending-up',
  REIT: 'building-2',
  FIXED_INCOME: 'landmark',
  TREASURY: 'shield',
  CRYPTO: 'bitcoin',
  FUND: 'chart-pie',
  OTHER: 'package',
};

/**
 * Cor de cada tipo no gráfico de alocação.
 *
 * Vem da PALETTE validada para daltonismo e contraste, e não de cor literal —
 * regra 5 do CLAUDE.md. São sete tipos, então cabem nas oito primeiras, que são
 * as validadas.
 */
export const HOLDING_TYPE_COLORS: Record<HoldingType, string> = {
  STOCK: PALETTE[0],
  REIT: PALETTE[1],
  FIXED_INCOME: PALETTE[2],
  TREASURY: PALETTE[3],
  CRYPTO: PALETTE[4],
  FUND: PALETTE[5],
  OTHER: PALETTE[11],
};

// ---------------------------------------------------------------------------
// Avaliação de uma posição
// ---------------------------------------------------------------------------

export interface HoldingInput {
  id: string;
  name: string;
  ticker: string | null;
  type: HoldingType;
  /**
   * Quantidade de cotas/unidades. **Não é dinheiro** — por isso pode ser
   * fracionária (cripto tem 8 casas, fundos têm cotas quebradas) e por isso
   * não termina em `Cents`. A regra de centavos inteiros continua valendo para
   * todo valor monetário: o produto quantidade × preço é arredondado para
   * centavo aqui, uma vez só, e nunca acumulado em ponto flutuante.
   */
  quantity: number;
  avgPriceCents: Cents;
  currentPriceCents: Cents;
  accountId: string;
  accountName: string;
  updatedAt: Date;
}

export interface HoldingValuation extends HoldingInput {
  /** quantidade × preço atual, arredondado ao centavo. */
  marketValueCents: Cents;
  /** quantidade × preço médio pago. */
  costBasisCents: Cents;
  /** Valor de mercado menos custo. Negativo é prejuízo. */
  gainCents: Cents;
  /** Rentabilidade simples sobre o custo, em %. `null` quando o custo é zero. */
  gainPercent: number | null;
}

export function valueHolding(holding: HoldingInput): HoldingValuation {
  // Arredonda no fim, não no meio: arredondar o preço antes de multiplicar
  // acumularia erro em posições com muitas unidades.
  const marketValueCents = Math.round(holding.quantity * holding.currentPriceCents);
  const costBasisCents = Math.round(holding.quantity * holding.avgPriceCents);
  const gainCents = marketValueCents - costBasisCents;

  return {
    ...holding,
    marketValueCents,
    costBasisCents,
    gainCents,
    gainPercent: costBasisCents > 0 ? (gainCents / costBasisCents) * 100 : null,
  };
}

// ---------------------------------------------------------------------------
// Carteira
// ---------------------------------------------------------------------------

export interface AllocationSlice {
  type: HoldingType;
  label: string;
  icon: string;
  color: string;
  valueCents: Cents;
  /** Fatia da carteira, 0–100. */
  percent: number;
  count: number;
}

export interface PortfolioSummary {
  holdings: HoldingValuation[];
  marketValueCents: Cents;
  costBasisCents: Cents;
  gainCents: Cents;
  gainPercent: number | null;
  allocation: AllocationSlice[];
  /** Tipos distintos com posição. É o que alimenta a diversidade na vila. */
  distinctTypes: number;
}

export function summarizePortfolio(inputs: readonly HoldingInput[]): PortfolioSummary {
  const holdings = inputs.map(valueHolding);

  const marketValueCents = holdings.reduce((acc, h) => acc + h.marketValueCents, 0);
  const costBasisCents = holdings.reduce((acc, h) => acc + h.costBasisCents, 0);
  const gainCents = marketValueCents - costBasisCents;

  const byType = new Map<HoldingType, { valueCents: number; count: number }>();
  for (const holding of holdings) {
    const bucket = byType.get(holding.type) ?? { valueCents: 0, count: 0 };
    bucket.valueCents += holding.marketValueCents;
    bucket.count += 1;
    byType.set(holding.type, bucket);
  }

  const allocation: AllocationSlice[] = Array.from(byType, ([type, bucket]) => ({
    type,
    label: HOLDING_TYPE_LABELS[type],
    icon: HOLDING_TYPE_ICONS[type],
    color: HOLDING_TYPE_COLORS[type],
    valueCents: bucket.valueCents,
    percent: marketValueCents > 0 ? (bucket.valueCents / marketValueCents) * 100 : 0,
    count: bucket.count,
  })).sort((a, b) => b.valueCents - a.valueCents || a.label.localeCompare(b.label, 'pt-BR'));

  return {
    holdings: holdings
      .slice()
      .sort(
        (a, b) => b.marketValueCents - a.marketValueCents || a.name.localeCompare(b.name, 'pt-BR'),
      ),
    marketValueCents,
    costBasisCents,
    gainCents,
    gainPercent: costBasisCents > 0 ? (gainCents / costBasisCents) * 100 : null,
    allocation,
    distinctTypes: byType.size,
  };
}

/**
 * Só o valor de mercado da carteira.
 *
 * Existe para quem precisa do número e não do resumo inteiro — o cálculo do
 * patrimônio, por exemplo. Evita montar a alocação e ordenar as posições à toa,
 * e evita que `queries/accounts.ts` tenha que importar `queries/investments.ts`,
 * que importa `queries/accounts.ts` de volta.
 */
export function portfolioValueCents(
  holdings: readonly { quantity: number; currentPriceCents: Cents }[],
): Cents {
  return holdings.reduce((acc, h) => acc + Math.round(h.quantity * h.currentPriceCents), 0);
}

// ---------------------------------------------------------------------------
// Patrimônio líquido
// ---------------------------------------------------------------------------

export interface NetWorthAccount {
  balanceCents: Cents;
  archived: boolean;
}

export interface NetWorth {
  /** Saldos positivos + valor de mercado da carteira. */
  assetsCents: Cents;
  /** Tudo que está a descoberto, em módulo: dívida de cartão e conta negativa. */
  liabilitiesCents: Cents;
  netCents: Cents;
  /** A parte líquida: dinheiro em conta, sem os investimentos. */
  cashCents: Cents;
  investedCents: Cents;
}

/**
 * Ativos menos passivos.
 *
 * Um saldo negativo é passivo venha de onde vier — a fatura do cartão e uma
 * conta corrente no vermelho contam igual. Contas arquivadas ficam de fora:
 * elas representam o passado, não dinheiro de hoje.
 */
export function computeNetWorth(
  accounts: readonly NetWorthAccount[],
  portfolioValueCents: Cents = 0,
): NetWorth {
  let cashCents = 0;
  let liabilitiesCents = 0;

  for (const account of accounts) {
    if (account.archived) continue;
    if (account.balanceCents >= 0) cashCents += account.balanceCents;
    else liabilitiesCents += -account.balanceCents;
  }

  const assetsCents = cashCents + portfolioValueCents;

  return {
    assetsCents,
    liabilitiesCents,
    netCents: assetsCents - liabilitiesCents,
    cashCents,
    investedCents: portfolioValueCents,
  };
}

export interface NetWorthPoint {
  capturedOn: Date;
  assetsCents: Cents;
  liabilitiesCents: Cents;
  netCents: Cents;
}

export interface NetWorthChange {
  absoluteCents: Cents;
  /** `null` quando a base não é positiva — ver o comentário abaixo. */
  percent: number | null;
}

/** Variação entre a primeira e a última fotografia. `null` com menos de duas. */
export function netWorthChange(history: readonly NetWorthPoint[]): NetWorthChange | null {
  if (history.length < 2) return null;

  const first = history[0]!;
  const last = history[history.length - 1]!;
  const absoluteCents = last.netCents - first.netCents;

  return {
    absoluteCents,
    // Base negativa ou zero não dá porcentagem com significado: sair de −1000
    // para −500 não é "50% melhor" de nenhum jeito útil de ler.
    percent: first.netCents > 0 ? (absoluteCents / first.netCents) * 100 : null,
  };
}
