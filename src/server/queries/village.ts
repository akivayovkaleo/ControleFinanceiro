/**
 * Leitura da vila.
 *
 * Somente leitura e sempre filtrada por `spaceId` — ver a regra de ouro em
 * src/lib/auth/guard.ts. Esta camada não decide nada: ela busca as linhas e
 * entrega para `@/lib/village/projection`, que é puro e testado.
 */

import 'server-only';
import { db } from '@/lib/db';
import type { BuildingCategory, Era } from '@/lib/village/catalog';
import type { GrowthRule } from '@/lib/village/growth';
import {
  bucketForCategory,
  projectVillage,
  type VillageLedgerRow,
  type VillageState,
} from '@/lib/village/projection';

/**
 * O estado da vila de um espaço.
 *
 * ---------------------------------------------------------------------------
 * DUAS DECISÕES QUE VALE EXPLICAR
 * ---------------------------------------------------------------------------
 * 1. É HISTÓRICO INTEIRO, não a competência do mês. Uma vila que encolhe toda
 *    virada de mês não seria uma vila — seria um gráfico. O que foi construído
 *    fica construído.
 *
 * 2. Conta RECEITA E DESPESA. A vila premia organização, não gasto (ver a
 *    regra anti-inflação em `@/lib/village/growth`), então classificar bem o
 *    que entra vale tanto quanto classificar o que sai. Transferência fica de
 *    fora: é dinheiro andando entre contas do próprio espaço, não fato novo.
 */
export async function getVillageState(
  spaceId: string,
  rule: GrowthRule,
  era: Era,
): Promise<VillageState> {
  const [totals, categories] = await Promise.all([
    db.transaction.groupBy({
      by: ['categoryId'],
      where: {
        spaceId,
        type: { in: ['INCOME', 'EXPENSE'] },
        categoryId: { not: null },
      },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    // Inclui arquivadas de propósito: o prédio foi construído com elas, e
    // arquivar uma categoria não desfaz o histórico que ela gerou.
    db.category.findMany({
      where: { spaceId },
      select: { id: true, name: true, icon: true },
    }),
  ]);

  const byId = new Map(categories.map((category) => [category.id, category]));

  const rows: VillageLedgerRow[] = totals.flatMap((total) => {
    if (!total.categoryId) return [];
    const category = byId.get(total.categoryId);
    if (!category) return [];

    return [
      {
        categoryId: category.id,
        name: category.name,
        icon: category.icon,
        amountCents: Math.abs(total._sum.amountCents ?? 0),
        transactionCount: total._count._all,
      },
    ];
  });

  return projectVillage(rows, rule, era);
}

/**
 * As categorias do espaço que compõem um prédio.
 *
 * É o que traduz `/lancamentos?vila=casa` num filtro de verdade. Lista vazia
 * é resposta legítima: o prédio existe, mas nenhuma categoria caiu nele.
 */
export async function getCategoryIdsForBuilding(
  spaceId: string,
  building: BuildingCategory,
): Promise<string[]> {
  const categories = await db.category.findMany({
    where: { spaceId },
    select: { id: true, name: true, icon: true },
  });

  return categories
    .filter((category) => bucketForCategory(category) === building)
    .map((category) => category.id);
}
