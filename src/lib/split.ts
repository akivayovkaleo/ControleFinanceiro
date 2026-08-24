/**
 * Divisão de despesas entre membros de um space.
 *
 * Este é o coração do "modo casal". Toda despesa responde a duas perguntas:
 *
 *   1. Quem PAGOU?    → Transaction.paidByMembershipId (saiu do bolso de quem)
 *   2. Quem DEVE?     → TransactionShare[]              (de quem era a conta)
 *
 * Quando as duas respostas diferem, nasce uma dívida entre os membros — que o
 * acerto de contas (src/lib/settlement.ts) transforma em "quem paga quanto a quem".
 *
 * INVARIANTE CENTRAL: a soma dos shares é SEMPRE exatamente o valor da
 * transação. Nada de centavo sumido. Garantido por splitEvenly/splitByWeights.
 */

import { splitByWeights, splitEvenly } from './money';

export type SplitMode = 'OWNER' | 'EQUAL' | 'INCOME_RATIO' | 'CUSTOM';

export interface SplitMember {
  membershipId: string;
  /** Renda mensal em centavos. Usada apenas no modo INCOME_RATIO. */
  monthlyIncomeCents?: number | null;
}

export interface Share {
  membershipId: string;
  amountCents: number;
}

export const SPLIT_MODE_LABELS: Record<SplitMode, string> = {
  OWNER: 'Só de quem pagou',
  EQUAL: 'Meio a meio',
  INCOME_RATIO: 'Proporcional à renda',
  CUSTOM: 'Personalizado',
};

export const SPLIT_MODE_HINTS: Record<SplitMode, string> = {
  OWNER: 'Gasto individual: ninguém deve nada a ninguém.',
  EQUAL: 'Dividido em partes iguais entre todos os membros.',
  INCOME_RATIO: 'Quem ganha mais paga uma fatia maior. Exige a renda preenchida no perfil.',
  CUSTOM: 'Você define quanto cabe a cada um.',
};

/**
 * Calcula os shares de uma transação.
 *
 * @param amountCents  Valor total (sempre positivo).
 * @param mode         Modo de divisão.
 * @param members      Membros do space, em ordem ESTÁVEL (ordene por
 *                     membershipId antes de chamar) — a ordem decide quem
 *                     recebe os centavos de resto.
 * @param paidByMembershipId  Necessário no modo OWNER.
 * @param customShares Necessário no modo CUSTOM: valores em centavos por membro.
 */
export function computeShares(params: {
  amountCents: number;
  mode: SplitMode;
  members: SplitMember[];
  paidByMembershipId?: string | null;
  customShares?: Record<string, number>;
}): Share[] {
  const { amountCents, mode, members, paidByMembershipId, customShares } = params;

  if (members.length === 0) return [];

  // Ordem estável: sem isso, a distribuição do centavo de resto mudaria a
  // cada consulta e o total do acerto oscilaria.
  const sorted = [...members].sort((a, b) => a.membershipId.localeCompare(b.membershipId));

  switch (mode) {
    case 'OWNER': {
      const owner = paidByMembershipId ?? sorted[0]!.membershipId;
      const exists = sorted.some((m) => m.membershipId === owner);
      const target = exists ? owner : sorted[0]!.membershipId;
      return [{ membershipId: target, amountCents }];
    }

    case 'EQUAL': {
      const parts = splitEvenly(amountCents, sorted.length);
      return sorted.map((m, i) => ({ membershipId: m.membershipId, amountCents: parts[i]! }));
    }

    case 'INCOME_RATIO': {
      const weights = sorted.map((m) => m.monthlyIncomeCents ?? 0);
      // Sem nenhuma renda declarada, proporcional não significa nada:
      // cai para meio a meio em vez de jogar tudo em cima de uma pessoa.
      const parts = weights.some((w) => w > 0)
        ? splitByWeights(amountCents, weights)
        : splitEvenly(amountCents, sorted.length);
      return sorted.map((m, i) => ({ membershipId: m.membershipId, amountCents: parts[i]! }));
    }

    case 'CUSTOM': {
      const raw = sorted.map((m) => Math.max(0, Math.round(customShares?.[m.membershipId] ?? 0)));
      const total = raw.reduce((a, b) => a + b, 0);

      // Se o usuário digitou valores que não fecham o total, reescalamos
      // proporcionalmente em vez de recusar — a UI já avisa da diferença, e
      // gravar um share que não soma quebraria o acerto de contas.
      if (total === amountCents) {
        return sorted.map((m, i) => ({ membershipId: m.membershipId, amountCents: raw[i]! }));
      }
      const parts = total > 0 ? splitByWeights(amountCents, raw) : splitEvenly(amountCents, sorted.length);
      return sorted.map((m, i) => ({ membershipId: m.membershipId, amountCents: parts[i]! }));
    }

    default: {
      const parts = splitEvenly(amountCents, sorted.length);
      return sorted.map((m, i) => ({ membershipId: m.membershipId, amountCents: parts[i]! }));
    }
  }
}

/**
 * Verificação do invariante. Usada nos testes e como guarda em runtime antes
 * de gravar — um bug aqui vira dinheiro errado no bolso de alguém.
 */
export function assertSharesBalance(amountCents: number, shares: Share[]): void {
  const total = shares.reduce((acc, s) => acc + s.amountCents, 0);
  if (total !== amountCents) {
    throw new Error(
      `Divisão inconsistente: shares somam ${total} centavos, esperado ${amountCents}.`,
    );
  }
}

/** Percentual que cada membro representa, para exibir na UI. */
export function sharesToPercent(amountCents: number, shares: Share[]): Record<string, number> {
  if (amountCents === 0) return {};
  return Object.fromEntries(
    shares.map((s) => [s.membershipId, (s.amountCents / amountCents) * 100]),
  );
}

/**
 * O modo de divisão só faz sentido em space com mais de um membro.
 * Em space pessoal forçamos OWNER — evita UI confusa e dados sem significado.
 */
export function effectiveSplitMode(mode: SplitMode, memberCount: number): SplitMode {
  return memberCount <= 1 ? 'OWNER' : mode;
}
