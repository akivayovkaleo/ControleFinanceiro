/**
 * Acerto de contas — "quem deve quanto a quem".
 *
 * Dado um conjunto de despesas com "quem pagou" e "quem devia", calcula o
 * saldo líquido de cada membro e propõe o MENOR número de transferências
 * que zera todo mundo.
 *
 * Exemplo com duas pessoas:
 *   Kaleo pagou R$ 1.000 de aluguel, dividido meio a meio → ele bancou R$ 500
 *   que não eram dele.
 *   Ana pagou R$ 300 de mercado, meio a meio → ela bancou R$ 150 dele.
 *   Saldo: Kaleo +350, Ana -350 → "Ana paga R$ 350,00 para Kaleo".
 *
 * O algoritmo é genérico para N membros (o casal é o caso N=2), então
 * continua correto se um dia entrar um terceiro no space.
 */

export interface SettlementInput {
  membershipId: string;
  /** Total que este membro DESEMBOLSOU no período, em centavos. */
  paidCents: number;
  /** Total que ERA DELE no período (soma dos shares), em centavos. */
  owedCents: number;
}

export interface Balance {
  membershipId: string;
  paidCents: number;
  owedCents: number;
  /** paid − owed. Positivo = tem a receber. Negativo = deve. */
  netCents: number;
}

export interface Transfer {
  fromMembershipId: string;
  toMembershipId: string;
  amountCents: number;
}

/** Saldo líquido por membro, ordenado de forma estável. */
export function computeBalances(inputs: SettlementInput[]): Balance[] {
  return inputs
    .map((i) => ({
      membershipId: i.membershipId,
      paidCents: i.paidCents,
      owedCents: i.owedCents,
      netCents: i.paidCents - i.owedCents,
    }))
    .sort((a, b) => a.membershipId.localeCompare(b.membershipId));
}

/**
 * Transferências que zeram todos os saldos.
 *
 * Estratégia gulosa: pega quem mais deve e quem mais tem a receber e liquida
 * o menor dos dois valores; repete. Para N=2 é ótimo por construção; para N
 * maior é uma boa aproximação do mínimo (o problema exato é NP-difícil, e a
 * diferença só apareceria num space com muitos membros).
 *
 * Ignora resíduos de 0 centavo. Se os saldos não somarem zero — o que só
 * acontece se um share tiver sido gravado quebrado — o excedente é
 * silenciosamente descartado pelo laço, e `validateBalances` avisa antes.
 */
export function computeTransfers(balances: Balance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ id: b.membershipId, amount: -b.netCents }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ id: b.membershipId, amount: b.netCents }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      transfers.push({
        fromMembershipId: debtor.id,
        toMembershipId: creditor.id,
        amountCents: amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return transfers;
}

/**
 * Os saldos devem somar zero: todo centavo pago por alguém foi devido por
 * alguém. Se não somar, há transação com shares quebrados.
 */
export function validateBalances(balances: Balance[]): { ok: boolean; driftCents: number } {
  const drift = balances.reduce((acc, b) => acc + b.netCents, 0);
  return { ok: drift === 0, driftCents: drift };
}

/** Atalho: dos totais brutos direto para as transferências propostas. */
export function settle(inputs: SettlementInput[]): {
  balances: Balance[];
  transfers: Transfer[];
  driftCents: number;
} {
  const balances = computeBalances(inputs);
  const { driftCents } = validateBalances(balances);
  return { balances, transfers: computeTransfers(balances), driftCents };
}
