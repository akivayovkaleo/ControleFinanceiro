import { describe, expect, it } from 'vitest';
import {
  computeNetWorth,
  HOLDING_TYPES,
  HOLDING_TYPE_COLORS,
  HOLDING_TYPE_ICONS,
  HOLDING_TYPE_LABELS,
  netWorthChange,
  portfolioValueCents,
  summarizePortfolio,
  valueHolding,
  type HoldingInput,
} from '@/lib/investments';
import { PALETTE } from '@/lib/presets';
import { utcDate } from '@/lib/date';

const holding = (over: Partial<HoldingInput> & { id: string }): HoldingInput => ({
  name: 'Posição',
  ticker: null,
  type: 'STOCK',
  quantity: 10,
  avgPriceCents: 1000,
  currentPriceCents: 1200,
  accountId: 'acc-1',
  accountName: 'Corretora',
  updatedAt: utcDate(2026, 3, 1),
  ...over,
});

describe('valueHolding', () => {
  it('calcula valor de mercado, custo e ganho', () => {
    const value = valueHolding(holding({ id: 'h1', quantity: 10, avgPriceCents: 1000, currentPriceCents: 1200 }));
    expect(value.marketValueCents).toBe(12000);
    expect(value.costBasisCents).toBe(10000);
    expect(value.gainCents).toBe(2000);
    expect(value.gainPercent).toBeCloseTo(20);
  });

  it('prejuízo vira ganho negativo', () => {
    const value = valueHolding(holding({ id: 'h1', currentPriceCents: 800 }));
    expect(value.gainCents).toBe(-2000);
    expect(value.gainPercent).toBeCloseTo(-20);
  });

  it('arredonda no fim, não no meio', () => {
    // 0.3 unidades a R$ 3,33: arredondar o preço antes daria outro número.
    const value = valueHolding(holding({ id: 'h1', quantity: 0.3, currentPriceCents: 333, avgPriceCents: 333 }));
    expect(value.marketValueCents).toBe(100);
    expect(value.gainCents).toBe(0);
  });

  it('aguenta quantidade fracionária de cripto sem estourar em centavo', () => {
    const value = valueHolding(
      holding({ id: 'h1', type: 'CRYPTO', quantity: 0.00012345, currentPriceCents: 50_000_000, avgPriceCents: 50_000_000 }),
    );
    expect(Number.isInteger(value.marketValueCents)).toBe(true);
    expect(value.marketValueCents).toBe(6173);
  });

  it('custo zero não vira divisão por zero', () => {
    const value = valueHolding(holding({ id: 'h1', avgPriceCents: 0 }));
    expect(value.costBasisCents).toBe(0);
    expect(value.gainPercent).toBeNull();
  });
});

describe('summarizePortfolio', () => {
  const carteira = [
    holding({ id: 'a', type: 'STOCK', quantity: 10, avgPriceCents: 1000, currentPriceCents: 1200 }),
    holding({ id: 'b', type: 'REIT', quantity: 5, avgPriceCents: 2000, currentPriceCents: 2000 }),
    holding({ id: 'c', type: 'STOCK', quantity: 2, avgPriceCents: 5000, currentPriceCents: 4000 }),
  ];

  it('soma a carteira inteira', () => {
    const summary = summarizePortfolio(carteira);
    // 12000 + 10000 + 8000
    expect(summary.marketValueCents).toBe(30000);
    // 10000 + 10000 + 10000
    expect(summary.costBasisCents).toBe(30000);
    expect(summary.gainCents).toBe(0);
  });

  it('a alocação soma o valor de mercado, sem centavo perdido', () => {
    const summary = summarizePortfolio(carteira);
    const somaFatias = summary.allocation.reduce((acc, s) => acc + s.valueCents, 0);
    expect(somaFatias).toBe(summary.marketValueCents);
  });

  it('as porcentagens somam 100', () => {
    const summary = summarizePortfolio(carteira);
    const total = summary.allocation.reduce((acc, s) => acc + s.percent, 0);
    expect(total).toBeCloseTo(100);
  });

  it('agrupa por tipo e conta quantas posições cada um tem', () => {
    const summary = summarizePortfolio(carteira);
    const acoes = summary.allocation.find((s) => s.type === 'STOCK')!;
    expect(acoes.count).toBe(2);
    expect(acoes.valueCents).toBe(20000);
    expect(summary.distinctTypes).toBe(2);
  });

  it('ordena as posições da maior para a menor', () => {
    const summary = summarizePortfolio(carteira);
    const valores = summary.holdings.map((h) => h.marketValueCents);
    expect(valores).toEqual([...valores].sort((a, b) => b - a));
  });

  it('carteira vazia não divide por zero', () => {
    const summary = summarizePortfolio([]);
    expect(summary.marketValueCents).toBe(0);
    expect(summary.gainPercent).toBeNull();
    expect(summary.allocation).toEqual([]);
    expect(summary.distinctTypes).toBe(0);
  });
});

describe('portfolioValueCents', () => {
  it('bate com o total do resumo completo', () => {
    const carteira = [
      holding({ id: 'a', quantity: 10, currentPriceCents: 1200 }),
      holding({ id: 'b', quantity: 0.5, currentPriceCents: 3333 }),
      holding({ id: 'c', quantity: 3, currentPriceCents: 999 }),
    ];
    expect(portfolioValueCents(carteira)).toBe(summarizePortfolio(carteira).marketValueCents);
  });

  it('carteira vazia vale zero', () => {
    expect(portfolioValueCents([])).toBe(0);
  });

  it('devolve centavo inteiro mesmo com quantidade fracionária', () => {
    const total = portfolioValueCents([{ quantity: 0.333333, currentPriceCents: 12345 }]);
    expect(Number.isInteger(total)).toBe(true);
  });
});

describe('computeNetWorth', () => {
  it('separa dinheiro em conta de dívida', () => {
    const net = computeNetWorth([
      { balanceCents: 500000, archived: false },
      { balanceCents: -120000, archived: false },
    ]);
    expect(net.cashCents).toBe(500000);
    expect(net.liabilitiesCents).toBe(120000);
    expect(net.netCents).toBe(380000);
  });

  it('soma a carteira aos ativos, sem contar duas vezes', () => {
    const net = computeNetWorth([{ balanceCents: 100000, archived: false }], 250000);
    expect(net.cashCents).toBe(100000);
    expect(net.investedCents).toBe(250000);
    expect(net.assetsCents).toBe(350000);
    expect(net.netCents).toBe(350000);
  });

  it('ignora conta arquivada — ela é o passado', () => {
    const net = computeNetWorth([
      { balanceCents: 100000, archived: false },
      { balanceCents: 999999, archived: true },
    ]);
    expect(net.netCents).toBe(100000);
  });

  it('patrimônio negativo é possível e sai com sinal', () => {
    const net = computeNetWorth([
      { balanceCents: 10000, archived: false },
      { balanceCents: -80000, archived: false },
    ]);
    expect(net.netCents).toBe(-70000);
  });

  it('sem conta nenhuma dá tudo zero', () => {
    expect(computeNetWorth([]).netCents).toBe(0);
  });
});

describe('netWorthChange', () => {
  const point = (capturedOn: Date, netCents: number) => ({
    capturedOn,
    netCents,
    assetsCents: Math.max(0, netCents),
    liabilitiesCents: Math.max(0, -netCents),
  });

  it('mede a variação entre a primeira e a última fotografia', () => {
    const change = netWorthChange([
      point(utcDate(2026, 1, 1), 100000),
      point(utcDate(2026, 2, 1), 110000),
      point(utcDate(2026, 3, 1), 150000),
    ])!;
    expect(change.absoluteCents).toBe(50000);
    expect(change.percent).toBeCloseTo(50);
  });

  it('menos de duas fotografias não é variação', () => {
    expect(netWorthChange([])).toBeNull();
    expect(netWorthChange([point(utcDate(2026, 1, 1), 100000)])).toBeNull();
  });

  it('base negativa não vira porcentagem sem sentido', () => {
    // Sair de −1000 para −500 não é "50% melhor" de nenhum jeito útil de ler.
    const change = netWorthChange([
      point(utcDate(2026, 1, 1), -100000),
      point(utcDate(2026, 2, 1), -50000),
    ])!;
    expect(change.absoluteCents).toBe(50000);
    expect(change.percent).toBeNull();
  });
});

describe('catálogo de tipos', () => {
  it('todo tipo tem rótulo, ícone e cor', () => {
    for (const type of HOLDING_TYPES) {
      expect(HOLDING_TYPE_LABELS[type]).toBeTruthy();
      expect(HOLDING_TYPE_ICONS[type]).toBeTruthy();
      expect(HOLDING_TYPE_COLORS[type]).toBeTruthy();
    }
  });

  it('as cores saem da PALETTE validada, sem cor literal solta', () => {
    for (const type of HOLDING_TYPES) {
      expect(PALETTE).toContain(HOLDING_TYPE_COLORS[type]);
    }
  });

  it('nenhum tipo divide cor com outro', () => {
    const cores = HOLDING_TYPES.map((t) => HOLDING_TYPE_COLORS[t]);
    expect(new Set(cores).size).toBe(cores.length);
  });
});
