import { describe, expect, it } from 'vitest';
import { assertSharesBalance, computeShares, effectiveSplitMode, type SplitMember } from '@/lib/split';
import { sumCents } from '@/lib/money';

// ids escolhidos para que a ordenação alfabética seja previsível nos testes
const kaleo: SplitMember = { membershipId: 'm-a-kaleo', monthlyIncomeCents: 500000 };
const ana: SplitMember = { membershipId: 'm-b-ana', monthlyIncomeCents: 300000 };
const casal = [kaleo, ana];

const totalOf = (shares: { amountCents: number }[]) => sumCents(shares.map((s) => s.amountCents));

describe('computeShares — OWNER', () => {
  it('joga o valor inteiro em quem pagou', () => {
    const shares = computeShares({
      amountCents: 8990,
      mode: 'OWNER',
      members: casal,
      paidByMembershipId: 'm-b-ana',
    });
    expect(shares).toEqual([{ membershipId: 'm-b-ana', amountCents: 8990 }]);
  });

  it('cai para o primeiro membro se quem pagou não estiver no space', () => {
    const shares = computeShares({
      amountCents: 100,
      mode: 'OWNER',
      members: casal,
      paidByMembershipId: 'ex-membro',
    });
    expect(shares[0]!.membershipId).toBe('m-a-kaleo');
    expect(totalOf(shares)).toBe(100);
  });
});

describe('computeShares — EQUAL', () => {
  it('divide meio a meio', () => {
    const shares = computeShares({ amountCents: 10000, mode: 'EQUAL', members: casal });
    expect(shares).toEqual([
      { membershipId: 'm-a-kaleo', amountCents: 5000 },
      { membershipId: 'm-b-ana', amountCents: 5000 },
    ]);
  });

  it('não perde o centavo em valor ímpar', () => {
    const shares = computeShares({ amountCents: 10001, mode: 'EQUAL', members: casal });
    expect(totalOf(shares)).toBe(10001);
    expect(shares.map((s) => s.amountCents).sort()).toEqual([5000, 5001]);
  });

  it('é estável: o centavo de resto vai sempre para o mesmo membro', () => {
    const a = computeShares({ amountCents: 333, mode: 'EQUAL', members: casal });
    const b = computeShares({ amountCents: 333, mode: 'EQUAL', members: [ana, kaleo] });
    expect(a).toEqual(b);
  });
});

describe('computeShares — INCOME_RATIO', () => {
  it('quem ganha mais paga mais', () => {
    // Kaleo 5.000 / Ana 3.000 → 62,5% e 37,5% de R$ 800
    const shares = computeShares({ amountCents: 80000, mode: 'INCOME_RATIO', members: casal });
    expect(shares).toEqual([
      { membershipId: 'm-a-kaleo', amountCents: 50000 },
      { membershipId: 'm-b-ana', amountCents: 30000 },
    ]);
  });

  it('cai para meio a meio se ninguém declarou renda', () => {
    const semRenda = [
      { membershipId: 'm-a-kaleo', monthlyIncomeCents: null },
      { membershipId: 'm-b-ana', monthlyIncomeCents: null },
    ];
    const shares = computeShares({ amountCents: 10000, mode: 'INCOME_RATIO', members: semRenda });
    expect(shares.map((s) => s.amountCents)).toEqual([5000, 5000]);
  });

  it('funciona com só uma renda declarada', () => {
    const parcial = [
      { membershipId: 'm-a-kaleo', monthlyIncomeCents: 500000 },
      { membershipId: 'm-b-ana', monthlyIncomeCents: null },
    ];
    const shares = computeShares({ amountCents: 10000, mode: 'INCOME_RATIO', members: parcial });
    expect(totalOf(shares)).toBe(10000);
    expect(shares[0]!.amountCents).toBe(10000);
  });
});

describe('computeShares — CUSTOM', () => {
  it('respeita valores que fecham o total', () => {
    const shares = computeShares({
      amountCents: 10000,
      mode: 'CUSTOM',
      members: casal,
      customShares: { 'm-a-kaleo': 7000, 'm-b-ana': 3000 },
    });
    expect(shares).toEqual([
      { membershipId: 'm-a-kaleo', amountCents: 7000 },
      { membershipId: 'm-b-ana', amountCents: 3000 },
    ]);
  });

  it('reescala proporcionalmente quando o usuário não fecha a conta', () => {
    const shares = computeShares({
      amountCents: 10000,
      mode: 'CUSTOM',
      members: casal,
      customShares: { 'm-a-kaleo': 70, 'm-b-ana': 30 },
    });
    expect(totalOf(shares)).toBe(10000);
    expect(shares[0]!.amountCents).toBe(7000);
  });

  it('cai para igual se tudo for zero', () => {
    const shares = computeShares({
      amountCents: 10000,
      mode: 'CUSTOM',
      members: casal,
      customShares: {},
    });
    expect(shares.map((s) => s.amountCents)).toEqual([5000, 5000]);
  });
});

describe('invariante: shares sempre somam o total', () => {
  it('vale para todos os modos e uma faixa larga de valores', () => {
    const modes = ['OWNER', 'EQUAL', 'INCOME_RATIO', 'CUSTOM'] as const;
    for (const mode of modes) {
      for (const amount of [0, 1, 3, 99, 100, 101, 9999, 123457, 999999999]) {
        const shares = computeShares({
          amountCents: amount,
          mode,
          members: casal,
          paidByMembershipId: 'm-a-kaleo',
          customShares: { 'm-a-kaleo': 1, 'm-b-ana': 2 },
        });
        expect(() => assertSharesBalance(amount, shares)).not.toThrow();
      }
    }
  });

  it('vale para três membros', () => {
    const trio = [...casal, { membershipId: 'm-c-joao', monthlyIncomeCents: 100000 }];
    for (const amount of [1, 10, 100, 1000, 10001]) {
      const shares = computeShares({ amountCents: amount, mode: 'EQUAL', members: trio });
      expect(totalOf(shares)).toBe(amount);
    }
  });
});

describe('effectiveSplitMode', () => {
  it('força OWNER em space de uma pessoa só', () => {
    expect(effectiveSplitMode('EQUAL', 1)).toBe('OWNER');
    expect(effectiveSplitMode('INCOME_RATIO', 1)).toBe('OWNER');
  });

  it('preserva o modo quando há mais de um membro', () => {
    expect(effectiveSplitMode('EQUAL', 2)).toBe('EQUAL');
  });
});
