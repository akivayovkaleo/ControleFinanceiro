/**
 * Leitura das faturas de cartão.
 *
 * O que é o quê no ledger de um cartão:
 *
 * - **compra**  → `EXPENSE` na conta do cartão. Soma à fatura.
 * - **estorno** → `INCOME` na conta do cartão. Abate da fatura.
 * - **pagamento da fatura** → `TRANSFER` de outra conta PARA o cartão.
 *   NÃO entra na fatura: ele a quita. Contá-lo como lançamento faria o total
 *   da fatura cair sozinho conforme fosse pago, que é a leitura errada.
 *
 * O agrupamento em ciclos e todo o cálculo ficam em src/lib/credit-card.ts;
 * aqui só se busca e se traduz.
 */

import 'server-only';
import { db } from '@/lib/db';
import {
  buildStatements,
  closeKey,
  cycleFor,
  limitUsage,
  DEFAULT_STATEMENT_INCLUSIVE,
  type CardConfig,
  type LimitUsage,
  type Statement,
  type StatementEntry,
} from '@/lib/credit-card';
import { todayUtc } from '@/lib/date';
import { getAccountBalances } from './accounts';

export interface CardView {
  accountId: string;
  name: string;
  color: string;
  icon: string;
  config: CardConfig;
  balanceCents: number;
  limit: LimitUsage;
  statements: Statement[];
  /** A fatura que está aberta agora — a que as compras de hoje entram. */
  currentCloseKey: string;
}

/** Um cartão sem dia de fechamento configurado não tem ciclo; cai no dia 1. */
function configFor(account: {
  statementDay: number | null;
  dueDay: number | null;
  creditLimitCents: number | null;
  statementInclusive: boolean;
}): CardConfig {
  return {
    closingDay: account.statementDay ?? 1,
    dueDay: account.dueDay ?? 10,
    limitCents: account.creditLimitCents,
    statementInclusive: account.statementInclusive ?? DEFAULT_STATEMENT_INCLUSIVE,
  };
}

export async function getCard(spaceId: string, accountId: string): Promise<CardView | null> {
  const account = await db.account.findFirst({
    where: { id: accountId, spaceId, type: 'CREDIT_CARD' },
  });
  if (!account) return null;

  const config = configFor(account);
  const today = todayUtc();

  const [transactions, payments, balances] = await Promise.all([
    // Compras e estornos: o que forma a fatura.
    db.transaction.findMany({
      where: { spaceId, accountId, type: { in: ['EXPENSE', 'INCOME'] } },
      include: { category: { select: { name: true, color: true } } },
      orderBy: { date: 'asc' },
    }),
    // Pagamentos: transferência de outra conta para o cartão.
    db.transaction.findMany({
      where: { spaceId, type: 'TRANSFER', toAccountId: accountId },
      select: { amountCents: true, date: true, statementCloseDate: true },
    }),
    getAccountBalances(spaceId, { includeArchived: true }),
  ]);

  const entries: StatementEntry[] = transactions.map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    amountCents: transaction.amountCents,
    direction: transaction.type === 'EXPENSE' ? 'charge' : 'credit',
    categoryName: transaction.category?.name ?? null,
    categoryColor: transaction.category?.color ?? null,
    installmentNumber: transaction.installmentNumber,
    installmentTotal: transaction.installmentTotal,
  }));

  /**
   * A qual fatura cada pagamento pertence.
   *
   * `statementCloseDate` manda quando está preenchido. Sem ele, cai no ciclo da
   * própria data — o que erra quando alguém paga a fatura com atraso, já dentro
   * do ciclo seguinte. É por isso que o campo existe.
   */
  const paymentsByClose = new Map<string, number>();
  for (const payment of payments) {
    const key = closeKey(payment.statementCloseDate ?? cycleFor(payment.date, config).closeDate);
    paymentsByClose.set(key, (paymentsByClose.get(key) ?? 0) + payment.amountCents);
  }

  const balance = balances.find((b) => b.id === accountId);
  const balanceCents = balance?.balanceCents ?? 0;

  return {
    accountId: account.id,
    name: account.name,
    color: account.color,
    icon: account.icon,
    config,
    balanceCents,
    limit: limitUsage(account.creditLimitCents, balanceCents),
    statements: buildStatements({ entries, config, paymentsByClose, today }),
    currentCloseKey: closeKey(cycleFor(today, config).closeDate),
  };
}

export interface CardSummary {
  accountId: string;
  name: string;
  color: string;
  icon: string;
  balanceCents: number;
  limit: LimitUsage;
  /** Total da fatura aberta agora. */
  currentTotalCents: number;
  dueDate: Date;
}

/** Resumo de todos os cartões do space, para a lista e para o painel. */
export async function getCards(spaceId: string): Promise<CardSummary[]> {
  const accounts = await db.account.findMany({
    where: { spaceId, type: 'CREDIT_CARD', archived: false },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  if (accounts.length === 0) return [];

  const today = todayUtc();
  const balances = await getAccountBalances(spaceId);

  const summaries = await Promise.all(
    accounts.map(async (account) => {
      const config = configFor(account);
      const cycle = cycleFor(today, config);

      const spent = await db.transaction.groupBy({
        by: ['type'],
        where: {
          spaceId,
          accountId: account.id,
          type: { in: ['EXPENSE', 'INCOME'] },
          date: { gte: cycle.start, lte: cycle.end },
        },
        _sum: { amountCents: true },
      });

      const charges = spent.find((s) => s.type === 'EXPENSE')?._sum.amountCents ?? 0;
      const credits = spent.find((s) => s.type === 'INCOME')?._sum.amountCents ?? 0;
      const balanceCents = balances.find((b) => b.id === account.id)?.balanceCents ?? 0;

      return {
        accountId: account.id,
        name: account.name,
        color: account.color,
        icon: account.icon,
        balanceCents,
        limit: limitUsage(account.creditLimitCents, balanceCents),
        currentTotalCents: charges - credits,
        dueDate: cycle.dueDate,
      } satisfies CardSummary;
    }),
  );

  return summaries;
}
