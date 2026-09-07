/**
 * Leitura da carteira e do patrimônio.
 *
 * Como em todo o resto, nada é consultado sem `spaceId` — a autorização do app
 * se resume a "este usuário é membro deste space?" (ver src/lib/auth/guard.ts).
 */

import 'server-only';
import { db } from '@/lib/db';
import {
  summarizePortfolio,
  type HoldingInput,
  type HoldingType,
  type NetWorthPoint,
  type PortfolioSummary,
} from '@/lib/investments';
import { getAccountBalances } from './accounts';

export async function getPortfolio(spaceId: string): Promise<PortfolioSummary> {
  const holdings = await db.holding.findMany({
    where: { spaceId },
    include: { account: { select: { name: true } } },
    orderBy: [{ createdAt: 'asc' }],
  });

  const inputs: HoldingInput[] = holdings.map((holding) => ({
    id: holding.id,
    name: holding.name,
    ticker: holding.ticker,
    type: holding.type as HoldingType,
    quantity: holding.quantity,
    avgPriceCents: holding.avgPriceCents,
    currentPriceCents: holding.currentPriceCents,
    accountId: holding.accountId,
    accountName: holding.account.name,
    updatedAt: holding.updatedAt,
  }));

  return summarizePortfolio(inputs);
}

/**
 * O patrimônio de hoje mora em `getNetWorth` (queries/accounts.ts), que já soma
 * a carteira aos saldos. Não há uma segunda versão aqui de propósito: dois
 * caminhos para o mesmo número é como eles passam a discordar.
 *
 * Sempre derivado, nunca lido de `NetWorthSnapshot` — a fotografia existe só
 * para desenhar a evolução no tempo.
 */
export async function getNetWorthHistory(
  spaceId: string,
  opts: { limit?: number } = {},
): Promise<NetWorthPoint[]> {
  const snapshots = await db.netWorthSnapshot.findMany({
    where: { spaceId },
    orderBy: { capturedOn: 'asc' },
    take: opts.limit ?? 60,
  });

  return snapshots.map((snapshot) => ({
    capturedOn: snapshot.capturedOn,
    assetsCents: snapshot.assetsCents,
    liabilitiesCents: snapshot.liabilitiesCents,
    netCents: snapshot.netCents,
  }));
}

/**
 * Contas de investimento com saldo parado.
 *
 * O saldo de uma conta de investimento é o dinheiro que ainda NÃO foi aplicado.
 * Um saldo alto e parado costuma significar que a compra foi registrada como
 * posição mas o lançamento que tira o dinheiro da conta não foi feito — e aí o
 * mesmo dinheiro é contado duas vezes no patrimônio. A tela usa isto para
 * avisar, em vez de somar errado em silêncio.
 */
export async function getUninvestedCash(
  spaceId: string,
): Promise<{ accountId: string; accountName: string; balanceCents: number }[]> {
  const balances = await getAccountBalances(spaceId);

  return balances
    .filter((account) => account.type === 'INVESTMENT' && account.balanceCents > 0)
    .map((account) => ({
      accountId: account.id,
      accountName: account.name,
      balanceCents: account.balanceCents,
    }));
}
