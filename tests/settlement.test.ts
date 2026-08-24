import { describe, expect, it } from 'vitest';
import { computeBalances, computeTransfers, settle, validateBalances } from '@/lib/settlement';

describe('computeBalances', () => {
  it('saldo é o que pagou menos o que devia', () => {
    const balances = computeBalances([
      { membershipId: 'kaleo', paidCents: 100000, owedCents: 50000 },
      { membershipId: 'ana', paidCents: 30000, owedCents: 80000 },
    ]);
    expect(balances.find((b) => b.membershipId === 'kaleo')!.netCents).toBe(50000);
    expect(balances.find((b) => b.membershipId === 'ana')!.netCents).toBe(-50000);
  });
});

describe('computeTransfers — o caso do casal', () => {
  it('resolve com uma única transferência', () => {
    // Kaleo pagou 1.000 de aluguel (meio a meio) e Ana pagou 300 de mercado (meio a meio).
    const balances = computeBalances([
      { membershipId: 'kaleo', paidCents: 100000, owedCents: 65000 },
      { membershipId: 'ana', paidCents: 30000, owedCents: 65000 },
    ]);
    const transfers = computeTransfers(balances);
    expect(transfers).toEqual([
      { fromMembershipId: 'ana', toMembershipId: 'kaleo', amountCents: 35000 },
    ]);
  });

  it('não propõe nada quando já está quites', () => {
    const balances = computeBalances([
      { membershipId: 'kaleo', paidCents: 50000, owedCents: 50000 },
      { membershipId: 'ana', paidCents: 50000, owedCents: 50000 },
    ]);
    expect(computeTransfers(balances)).toEqual([]);
  });

  it('não propõe nada num período sem lançamentos', () => {
    const balances = computeBalances([
      { membershipId: 'kaleo', paidCents: 0, owedCents: 0 },
      { membershipId: 'ana', paidCents: 0, owedCents: 0 },
    ]);
    expect(computeTransfers(balances)).toEqual([]);
  });

  it('acerta até o último centavo', () => {
    const balances = computeBalances([
      { membershipId: 'kaleo', paidCents: 1, owedCents: 0 },
      { membershipId: 'ana', paidCents: 0, owedCents: 1 },
    ]);
    expect(computeTransfers(balances)).toEqual([
      { fromMembershipId: 'ana', toMembershipId: 'kaleo', amountCents: 1 },
    ]);
  });
});

describe('computeTransfers — mais de dois membros', () => {
  it('zera todos os saldos', () => {
    const balances = computeBalances([
      { membershipId: 'a', paidCents: 90000, owedCents: 30000 },
      { membershipId: 'b', paidCents: 0, owedCents: 30000 },
      { membershipId: 'c', paidCents: 0, owedCents: 30000 },
    ]);
    const transfers = computeTransfers(balances);

    const net = new Map(balances.map((b) => [b.membershipId, b.netCents]));
    for (const t of transfers) {
      net.set(t.fromMembershipId, net.get(t.fromMembershipId)! + t.amountCents);
      net.set(t.toMembershipId, net.get(t.toMembershipId)! - t.amountCents);
    }
    for (const value of net.values()) expect(value).toBe(0);
  });

  it('usa no máximo N-1 transferências', () => {
    const balances = computeBalances([
      { membershipId: 'a', paidCents: 100000, owedCents: 25000 },
      { membershipId: 'b', paidCents: 0, owedCents: 25000 },
      { membershipId: 'c', paidCents: 0, owedCents: 25000 },
      { membershipId: 'd', paidCents: 0, owedCents: 25000 },
    ]);
    expect(computeTransfers(balances).length).toBeLessThanOrEqual(3);
  });
});

describe('validateBalances', () => {
  it('aceita saldos que somam zero', () => {
    const balances = computeBalances([
      { membershipId: 'a', paidCents: 100, owedCents: 50 },
      { membershipId: 'b', paidCents: 0, owedCents: 50 },
    ]);
    expect(validateBalances(balances)).toEqual({ ok: true, driftCents: 0 });
  });

  it('detecta shares quebrados', () => {
    const balances = computeBalances([
      { membershipId: 'a', paidCents: 100, owedCents: 40 },
      { membershipId: 'b', paidCents: 0, owedCents: 50 },
    ]);
    expect(validateBalances(balances).ok).toBe(false);
    expect(validateBalances(balances).driftCents).toBe(10);
  });
});

describe('settle', () => {
  it('entrega saldos, transferências e drift de uma vez', () => {
    const result = settle([
      { membershipId: 'kaleo', paidCents: 100000, owedCents: 65000 },
      { membershipId: 'ana', paidCents: 30000, owedCents: 65000 },
    ]);
    expect(result.driftCents).toBe(0);
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0]!.amountCents).toBe(35000);
  });
});
