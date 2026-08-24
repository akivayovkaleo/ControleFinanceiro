/**
 * Saldos de contas.
 *
 * O saldo NÃO é um campo no banco — é derivado dos lançamentos. Guardar um
 * saldo materializado significaria mantê-lo sincronizado em toda criação,
 * edição e exclusão, e qualquer falha nesse caminho deixaria um número errado
 * na tela para sempre. Derivar é mais lento e sempre correto; para o volume
 * de um casal (milhares de lançamentos), é instantâneo.
 *
 *   saldo = saldo inicial
 *         + receitas na conta
 *         − despesas na conta
 *         + transferências recebidas
 *         − transferências enviadas
 */

import 'server-only';
import { db } from '@/lib/db';

export interface AccountBalance {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  archived: boolean;
  ownerMembershipId: string | null;
  creditLimitCents: number | null;
  statementDay: number | null;
  dueDay: number | null;
  openingBalanceCents: number;
  balanceCents: number;
  /** Quanto do limite do cartão já foi consumido (só para CREDIT_CARD). */
  usedLimitCents: number | null;
  transactionCount: number;
}

export async function getAccountBalances(
  spaceId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<AccountBalance[]> {
  const accounts = await db.account.findMany({
    where: { spaceId, ...(opts.includeArchived ? {} : { archived: false }) },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  if (accounts.length === 0) return [];

  // Três agregações em vez de N consultas por conta.
  const [byAccount, transfersIn, counts] = await Promise.all([
    db.transaction.groupBy({
      by: ['accountId', 'type'],
      where: { spaceId },
      _sum: { amountCents: true },
    }),
    db.transaction.groupBy({
      by: ['toAccountId'],
      where: { spaceId, type: 'TRANSFER', toAccountId: { not: null } },
      _sum: { amountCents: true },
    }),
    db.transaction.groupBy({
      by: ['accountId'],
      where: { spaceId },
      _count: { _all: true },
    }),
  ]);

  const outgoing = new Map<string, { income: number; expense: number; transfer: number }>();
  for (const row of byAccount) {
    const bucket = outgoing.get(row.accountId) ?? { income: 0, expense: 0, transfer: 0 };
    const amount = row._sum.amountCents ?? 0;
    if (row.type === 'INCOME') bucket.income += amount;
    else if (row.type === 'EXPENSE') bucket.expense += amount;
    else bucket.transfer += amount;
    outgoing.set(row.accountId, bucket);
  }

  const incoming = new Map<string, number>();
  for (const row of transfersIn) {
    if (row.toAccountId) incoming.set(row.toAccountId, row._sum.amountCents ?? 0);
  }

  const countMap = new Map(counts.map((c) => [c.accountId, c._count._all]));

  return accounts.map((account) => {
    const flow = outgoing.get(account.id) ?? { income: 0, expense: 0, transfer: 0 };
    const received = incoming.get(account.id) ?? 0;
    const balanceCents =
      account.openingBalanceCents + flow.income - flow.expense - flow.transfer + received;

    // Num cartão, o "saldo" é negativo conforme se gasta; o limite usado é o
    // módulo disso quando está no vermelho.
    const usedLimitCents =
      account.type === 'CREDIT_CARD' ? Math.max(0, -balanceCents) : null;

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      color: account.color,
      icon: account.icon,
      archived: account.archived,
      ownerMembershipId: account.ownerMembershipId,
      creditLimitCents: account.creditLimitCents,
      statementDay: account.statementDay,
      dueDay: account.dueDay,
      openingBalanceCents: account.openingBalanceCents,
      balanceCents,
      usedLimitCents,
      transactionCount: countMap.get(account.id) ?? 0,
    };
  });
}

/**
 * Patrimônio líquido: soma dos saldos, com cartões entrando como dívida.
 * Contas arquivadas ficam de fora — elas representam o passado.
 */
export async function getNetWorth(spaceId: string): Promise<{
  totalCents: number;
  assetsCents: number;
  liabilitiesCents: number;
}> {
  const balances = await getAccountBalances(spaceId);

  let assets = 0;
  let liabilities = 0;

  for (const account of balances) {
    if (account.balanceCents >= 0) assets += account.balanceCents;
    else liabilities += -account.balanceCents;
  }

  return { totalCents: assets - liabilities, assetsCents: assets, liabilitiesCents: liabilities };
}
