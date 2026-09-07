import { describe, expect, it } from 'vitest';
import {
  buildStatements,
  closeKey,
  cycleFor,
  dueDateFor,
  installmentDatesForCard,
  isInCycle,
  limitUsage,
  nextCycle,
  previousCycle,
  statementStatus,
  type CardConfig,
  type StatementEntry,
} from '@/lib/credit-card';
import { utcDate } from '@/lib/date';

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Cartão comum: fecha dia 10, vence dia 17, a compra do dia 10 entra. */
const card: CardConfig = {
  closingDay: 10,
  dueDay: 17,
  limitCents: 500000,
  statementInclusive: true,
};

/** O mesmo cartão, mas a compra do dia do fechamento vai para a fatura seguinte. */
const exclusive: CardConfig = { ...card, statementInclusive: false };

describe('cycleFor — a borda do dia de fechamento', () => {
  it('inclusivo: a compra no dia do fechamento entra nessa fatura', () => {
    const cycle = cycleFor(utcDate(2026, 3, 10), card);
    expect(iso(cycle.closeDate)).toBe('2026-03-10');
    expect(iso(cycle.start)).toBe('2026-02-11');
    expect(iso(cycle.end)).toBe('2026-03-10');
  });

  it('exclusivo: a mesma compra vai para a fatura seguinte', () => {
    const cycle = cycleFor(utcDate(2026, 3, 10), exclusive);
    expect(iso(cycle.closeDate)).toBe('2026-04-10');
    expect(iso(cycle.start)).toBe('2026-03-10');
    expect(iso(cycle.end)).toBe('2026-04-09');
  });

  it('a véspera do fechamento cai na fatura atual nos dois modos', () => {
    expect(iso(cycleFor(utcDate(2026, 3, 9), card).closeDate)).toBe('2026-03-10');
    expect(iso(cycleFor(utcDate(2026, 3, 9), exclusive).closeDate)).toBe('2026-03-10');
  });

  it('o dia seguinte ao fechamento abre a próxima fatura nos dois modos', () => {
    expect(iso(cycleFor(utcDate(2026, 3, 11), card).closeDate)).toBe('2026-04-10');
    expect(iso(cycleFor(utcDate(2026, 3, 11), exclusive).closeDate)).toBe('2026-04-10');
  });

  it('um ciclo cobre o intervalo inteiro, sem buraco entre faturas', () => {
    const march = cycleFor(utcDate(2026, 3, 1), card);
    const april = nextCycle(march, card);
    // O dia seguinte ao fim de uma fatura é o começo da próxima.
    expect(april.start.getTime() - march.end.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('cycleFor — meses curtos', () => {
  const day31: CardConfig = { ...card, closingDay: 31, dueDay: 10 };

  it('fechamento dia 31 encurta para o último dia de fevereiro', () => {
    expect(iso(cycleFor(utcDate(2026, 2, 15), day31).closeDate)).toBe('2026-02-28');
  });

  it('encurtar em fevereiro não prende o fechamento no dia 28', () => {
    // A regressão que este teste existe para pegar: reaplicar "dia 31" a partir
    // da config, e não preservar o dia 28 já encurtado.
    const feb = cycleFor(utcDate(2026, 2, 15), day31);
    expect(iso(nextCycle(feb, day31).closeDate)).toBe('2026-03-31');
  });

  it('anda para trás e para frente e volta ao mesmo ciclo', () => {
    const start = cycleFor(utcDate(2026, 2, 15), day31);
    const roundTrip = previousCycle(nextCycle(start, day31), day31);
    expect(iso(roundTrip.closeDate)).toBe(iso(start.closeDate));
  });
});

describe('dueDateFor', () => {
  it('vence no mesmo mês quando o vencimento é depois do fechamento', () => {
    expect(iso(dueDateFor(utcDate(2026, 3, 10), card))).toBe('2026-03-17');
  });

  it('vence no mês seguinte quando o vencimento é antes do fechamento', () => {
    const early: CardConfig = { ...card, closingDay: 25, dueDay: 5 };
    expect(iso(dueDateFor(utcDate(2026, 3, 25), early))).toBe('2026-04-05');
  });

  it('nunca vence antes de fechar', () => {
    for (let closingDay = 1; closingDay <= 28; closingDay++) {
      for (let dueDay = 1; dueDay <= 28; dueDay++) {
        const config: CardConfig = { ...card, closingDay, dueDay };
        const closeDate = utcDate(2026, 6, closingDay);
        expect(dueDateFor(closeDate, config).getTime()).toBeGreaterThan(closeDate.getTime());
      }
    }
  });
});

describe('installmentDatesForCard', () => {
  it('a primeira parcela fica na data da compra', () => {
    const dates = installmentDatesForCard(utcDate(2026, 3, 5), 3, card);
    expect(iso(dates[0]!)).toBe('2026-03-05');
  });

  it('cada parcela cai numa fatura diferente e consecutiva', () => {
    const dates = installmentDatesForCard(utcDate(2026, 3, 5), 12, card);
    const closes = dates.map((date) => iso(cycleFor(date, card).closeDate));
    expect(new Set(closes).size).toBe(12);
    expect(closes[0]).toBe('2026-03-10');
    expect(closes[11]).toBe('2027-02-10');
  });

  it('compra em 31/01 com fechamento dia 30 não pula nem repete fatura', () => {
    // O caso que motivou não somar meses direto na data da compra.
    const tricky: CardConfig = { ...card, closingDay: 30, dueDay: 7 };
    const dates = installmentDatesForCard(utcDate(2026, 1, 31), 4, tricky);
    const closes = dates.map((date) => iso(cycleFor(date, tricky).closeDate));
    expect(new Set(closes).size).toBe(4);
  });

  it('toda parcela cai dentro do ciclo a que pertence', () => {
    const dates = installmentDatesForCard(utcDate(2026, 1, 31), 24, { ...card, closingDay: 30 });
    for (const date of dates) {
      const cycle = cycleFor(date, { ...card, closingDay: 30 });
      expect(isInCycle(date, cycle)).toBe(true);
    }
  });

  it('recusa parcelamento sem parcela nenhuma', () => {
    expect(() => installmentDatesForCard(utcDate(2026, 3, 5), 0, card)).toThrow();
  });
});

// ---------------------------------------------------------------------------

const entry = (over: Partial<StatementEntry> & { id: string; date: Date }): StatementEntry => ({
  description: 'Compra',
  amountCents: 10000,
  direction: 'charge',
  categoryName: null,
  categoryColor: null,
  installmentNumber: null,
  installmentTotal: null,
  ...over,
});

describe('buildStatements', () => {
  const today = utcDate(2026, 3, 5);

  it('soma as compras do ciclo e abate os estornos', () => {
    const statements = buildStatements({
      entries: [
        entry({ id: 'a', date: utcDate(2026, 3, 1), amountCents: 10000 }),
        entry({ id: 'b', date: utcDate(2026, 3, 2), amountCents: 2500, direction: 'credit' }),
      ],
      config: card,
      paymentsByClose: new Map(),
      today,
    });

    const current = statements.find((s) => closeKey(s.cycle.closeDate) === '2026-03-10')!;
    expect(current.totalCents).toBe(7500);
    expect(current.entries).toHaveLength(2);
  });

  it('mostra faturas futuras vazias, porque é onde as parcelas vão cair', () => {
    const statements = buildStatements({
      entries: [],
      config: card,
      paymentsByClose: new Map(),
      today,
      futureCycles: 2,
      pastCycles: 0,
    });
    expect(statements.map((s) => closeKey(s.cycle.closeDate))).toEqual([
      '2026-03-10',
      '2026-04-10',
      '2026-05-10',
    ]);
  });

  it('não esconde uma parcela que caia além da janela', () => {
    const statements = buildStatements({
      entries: [entry({ id: 'longe', date: utcDate(2027, 6, 1) })],
      config: card,
      paymentsByClose: new Map(),
      today,
      futureCycles: 1,
      pastCycles: 0,
    });
    expect(statements.map((s) => closeKey(s.cycle.closeDate))).toContain('2027-06-10');
  });

  it('todo lançamento aparece em exatamente uma fatura', () => {
    const entries = Array.from({ length: 40 }, (_, i) =>
      entry({ id: `t-${i}`, date: utcDate(2026, 1 + (i % 6), 1 + (i % 28)) }),
    );
    const statements = buildStatements({
      entries,
      config: card,
      paymentsByClose: new Map(),
      today,
    });
    const seen = statements.flatMap((s) => s.entries.map((e) => e.id));
    expect(seen).toHaveLength(entries.length);
    expect(new Set(seen).size).toBe(entries.length);
  });

  it('desconta o pagamento e zera o que falta', () => {
    const statements = buildStatements({
      entries: [entry({ id: 'a', date: utcDate(2026, 2, 1), amountCents: 30000 })],
      config: card,
      paymentsByClose: new Map([['2026-02-10', 30000]]),
      today,
    });
    const closed = statements.find((s) => closeKey(s.cycle.closeDate) === '2026-02-10')!;
    expect(closed.paidCents).toBe(30000);
    expect(closed.outstandingCents).toBe(0);
    expect(closed.status).toBe('paid');
  });
});

describe('statementStatus', () => {
  const cycle = cycleFor(utcDate(2026, 3, 5), card);

  it('está aberta enquanto ainda pode receber lançamento', () => {
    expect(statementStatus(cycle, 10000, 0, utcDate(2026, 3, 5))).toBe('open');
  });

  it('continua aberta mesmo com pagamento adiantado', () => {
    expect(statementStatus(cycle, 10000, 10000, utcDate(2026, 3, 5))).toBe('open');
  });

  it('fatura vazia já fechada conta como paga', () => {
    expect(statementStatus(cycle, 0, 0, utcDate(2026, 3, 20))).toBe('paid');
  });

  it('fechada e não paga', () => {
    expect(statementStatus(cycle, 10000, 4000, utcDate(2026, 3, 20))).toBe('closed');
  });
});

describe('limitUsage', () => {
  it('o saldo negativo do cartão é a dívida', () => {
    const usage = limitUsage(500000, -120000);
    expect(usage.usedCents).toBe(120000);
    expect(usage.availableCents).toBe(380000);
    expect(usage.ratio).toBeCloseTo(0.24);
    expect(usage.overLimit).toBe(false);
  });

  it('saldo positivo é crédito a favor, não limite usado', () => {
    const usage = limitUsage(500000, 5000);
    expect(usage.usedCents).toBe(0);
    expect(usage.availableCents).toBe(500000);
  });

  it('acusa estouro de limite', () => {
    const usage = limitUsage(100000, -150000);
    expect(usage.overLimit).toBe(true);
    expect(usage.availableCents).toBe(-50000);
    // A fração satura em 1 para a barra de progresso não transbordar.
    expect(usage.ratio).toBe(1);
  });

  it('sem limite definido não inventa disponível', () => {
    const usage = limitUsage(null, -150000);
    expect(usage.usedCents).toBe(150000);
    expect(usage.availableCents).toBeNull();
    expect(usage.ratio).toBeNull();
    expect(usage.overLimit).toBe(false);
  });
});
