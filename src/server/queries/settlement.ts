/**
 * Dados do acerto de contas.
 *
 * Junta as duas metades da história do casal:
 *   - quanto cada um DESEMBOLSOU  (Transaction.paidByMembershipId)
 *   - quanto cada um DEVIA        (TransactionShare)
 *
 * Só entram despesas ainda NÃO quitadas (`settlementId: null`). Transferências
 * ficam de fora: mover dinheiro entre contas do próprio casal não cria dívida.
 * Receitas também ficam de fora — o acerto é sobre quem bancou o gasto.
 */

import 'server-only';
import { db } from '@/lib/db';
import { settle, type Balance, type Transfer } from '@/lib/settlement';

export interface MemberInfo {
  id: string;
  displayName: string;
  color: string;
}

export interface SettlementView {
  balances: Array<Balance & MemberInfo>;
  transfers: Array<Transfer & { from: MemberInfo; to: MemberInfo }>;
  /** Deveria ser sempre 0. Se não for, há share gravado quebrado. */
  driftCents: number;
  totalSharedCents: number;
  transactionCount: number;
  periodStart: Date | null;
  periodEnd: Date;
  isSettled: boolean;
}

/**
 * Calcula o acerto em aberto do space.
 *
 * @param until  Considera despesas até esta data (exclusive). Padrão: agora.
 */
export async function getOpenSettlement(
  spaceId: string,
  members: MemberInfo[],
  until: Date = new Date(),
): Promise<SettlementView> {
  // Só despesas: transferência é dinheiro andando dentro do próprio casal.
  const transactions = await db.transaction.findMany({
    where: {
      spaceId,
      type: 'EXPENSE',
      settlementId: null,
      date: { lt: until },
    },
    select: {
      id: true,
      amountCents: true,
      date: true,
      paidByMembershipId: true,
      shares: { select: { membershipId: true, amountCents: true } },
    },
    orderBy: { date: 'asc' },
  });

  const paid = new Map<string, number>(members.map((m) => [m.id, 0]));
  const owed = new Map<string, number>(members.map((m) => [m.id, 0]));
  let totalSharedCents = 0;
  let countedTransactions = 0;

  for (const tx of transactions) {
    // Sem "quem pagou" não dá para atribuir o desembolso: a transação não
    // participa do acerto (mas continua no extrato normalmente).
    if (!tx.paidByMembershipId || !paid.has(tx.paidByMembershipId)) continue;

    // Uma despesa só gera dívida se parte dela couber a outra pessoa.
    const sharesOfOthers = tx.shares.filter(
      (s) => s.membershipId !== tx.paidByMembershipId && owed.has(s.membershipId),
    );
    if (sharesOfOthers.length === 0) continue;

    paid.set(tx.paidByMembershipId, paid.get(tx.paidByMembershipId)! + tx.amountCents);
    for (const share of tx.shares) {
      if (!owed.has(share.membershipId)) continue;
      owed.set(share.membershipId, owed.get(share.membershipId)! + share.amountCents);
    }

    totalSharedCents += tx.amountCents;
    countedTransactions++;
  }

  const { balances, transfers, driftCents } = settle(
    members.map((m) => ({
      membershipId: m.id,
      paidCents: paid.get(m.id) ?? 0,
      owedCents: owed.get(m.id) ?? 0,
    })),
  );

  const byId = new Map(members.map((m) => [m.id, m]));
  const unknown: MemberInfo = { id: '', displayName: 'Alguém', color: '#94a3b8' };

  return {
    balances: balances.map((b) => ({ ...b, ...(byId.get(b.membershipId) ?? unknown) })),
    transfers: transfers.map((t) => ({
      ...t,
      from: byId.get(t.fromMembershipId) ?? unknown,
      to: byId.get(t.toMembershipId) ?? unknown,
    })),
    driftCents,
    totalSharedCents,
    transactionCount: countedTransactions,
    periodStart: transactions[0]?.date ?? null,
    periodEnd: until,
    isSettled: transfers.length === 0,
  };
}

/** Histórico de acertos já registrados. */
export async function getSettlementHistory(spaceId: string, limit = 20) {
  return db.settlement.findMany({
    where: { spaceId },
    include: {
      lines: {
        include: {
          from: { select: { id: true, displayName: true, color: true } },
          to: { select: { id: true, displayName: true, color: true } },
        },
      },
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Quanto cada membro consumiu no mês, independente de quem pagou.
 * É a resposta a "para onde foi o dinheiro de cada um".
 */
export async function getMemberSpending(
  spaceId: string,
  start: Date,
  end: Date,
): Promise<Map<string, { owedCents: number; paidCents: number }>> {
  const [shares, paidRows] = await Promise.all([
    db.transactionShare.groupBy({
      by: ['membershipId'],
      where: { transaction: { spaceId, type: 'EXPENSE', date: { gte: start, lt: end } } },
      _sum: { amountCents: true },
    }),
    db.transaction.groupBy({
      by: ['paidByMembershipId'],
      where: {
        spaceId,
        type: 'EXPENSE',
        date: { gte: start, lt: end },
        paidByMembershipId: { not: null },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const result = new Map<string, { owedCents: number; paidCents: number }>();

  for (const row of shares) {
    result.set(row.membershipId, {
      owedCents: row._sum.amountCents ?? 0,
      paidCents: 0,
    });
  }
  for (const row of paidRows) {
    if (!row.paidByMembershipId) continue;
    const entry = result.get(row.paidByMembershipId) ?? { owedCents: 0, paidCents: 0 };
    entry.paidCents = row._sum.amountCents ?? 0;
    result.set(row.paidByMembershipId, entry);
  }

  return result;
}
