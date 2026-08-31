/**
 * Regra de crescimento — como um prédio da vila sobe de tier.
 *
 * ===========================================================================
 * ESTA É A REGRA ANTI-INFLAÇÃO DO APP
 * ===========================================================================
 * Um app de vila que cresce com o VALOR GASTO ensina a coisa errada: quanto
 * mais você torra, mais bonita fica a sua vila. O modo canônico aqui é o
 * oposto — o prédio sobe pela DIVERSIDADE de categorias distintas que você
 * registrou nele. O que faz a vila crescer é organizar as finanças, não
 * aumentar a despesa.
 *
 * DOIS MODOS (escolha do usuário):
 *
 *   'diversity' (CANÔNICO) — o tier vem da variedade de categorias distintas
 *     do ledger projetadas naquele prédio. `typesPerTier` diz quantas valem um
 *     tier. Gastar R$ 10 mil em uma única categoria não sobe nada.
 *
 *   'value' (alternativa opcional) — o tier vem do valor acumulado, comparado
 *     a limiares POR CATEGORIA (em centavos). Categorias têm escalas muito
 *     diferentes: uma casa não se compara a um gasto de saúde. Mesmo aqui os
 *     limiares são por bucket justamente para não virar um placar de gasto.
 *
 * Nos dois modos, tier 0 = prédio "em obras".
 *
 * IMPORTANTE: estas funções são PURAS e não conhecem o ledger. Quem conta as
 * categorias distintas e soma o valor acumulado é `@/lib/village/projection`;
 * aqui só mora a matemática do tier.
 */

import type { Cents } from '@/lib/money';
import type { BuildingCategory, Tier } from '@/lib/village/catalog';
import { HUB_CATEGORY, TIER_UNDER_CONSTRUCTION } from '@/lib/village/catalog';

/** Modo de crescimento. `diversity` é o canônico. */
export const GROWTH_MODES = ['diversity', 'value'] as const;

export type GrowthMode = (typeof GROWTH_MODES)[number];

export const GROWTH_MODE_LABELS: Record<GrowthMode, string> = {
  diversity: 'Diversidade de tipos',
  value: 'Valor acumulado',
};

export const GROWTH_MODE_DESCRIPTIONS: Record<GrowthMode, string> = {
  diversity:
    'O prédio evolui conforme a variedade de tipos de lançamento que você registra nele. Premia organização, não gasto.',
  value:
    'O prédio evolui conforme o valor acumulado, comparado a limiares próprios de cada categoria.',
};

/** Quantos tipos distintos valem um tier, no modo diversidade. */
export type TypesPerTier = 1 | 2 | 3;

export const TYPES_PER_TIER_OPTIONS = [1, 2, 3] as const satisfies readonly TypesPerTier[];

/** O maior tier alcançável (o catálogo tem 3 níveis visuais). */
export const MAX_TIER = 3 satisfies Tier;

/**
 * Limiares do modo 'value', em CENTAVOS: valor mínimo para atingir os tiers
 * 1, 2 e 3 respectivamente. Abaixo do primeiro limiar o prédio fica em obras.
 *
 * `hub` é especial: seu "valor" é o patrimônio agregado da vila inteira, não
 * um valor próprio — daí os limiares muito mais altos.
 */
export type CategoryThresholds = readonly [Cents, Cents, Cents];

export const DEFAULT_VALUE_THRESHOLDS_CENTS: Record<BuildingCategory, CategoryThresholds> = {
  locomocao: [100_000, 1_500_000, 8_000_000], //   R$ 1k /  15k /  80k
  casa: [500_000, 15_000_000, 80_000_000], //   R$ 5k / 150k / 800k
  investimentos: [100_000, 2_000_000, 20_000_000], //   R$ 1k /  20k / 200k
  estudos: [50_000, 500_000, 4_000_000], // R$ 500 /   5k /  40k
  saude: [30_000, 300_000, 2_000_000], // R$ 300 /   3k /  20k
  custom: [100_000, 1_000_000, 10_000_000], //   R$ 1k /  10k / 100k
  hub: [500_000, 10_000_000, 100_000_000], //   R$ 5k / 100k /   1M — agregado
};

function clampToTier(raw: number): Tier {
  if (raw <= 0) return TIER_UNDER_CONSTRUCTION;
  if (raw >= MAX_TIER) return MAX_TIER;
  // Aqui raw ∈ {1, 2} — estreitamos para o literal.
  return raw === 1 ? 1 : 2;
}

/**
 * REGRA CANÔNICA. Tier pela variedade de tipos distintos no prédio.
 *
 * Com `typesPerTier = 1`: 0 tipos → em obras, 1 → tier 1, 2 → tier 2, 3+ → tier 3.
 * Com `typesPerTier = 2`: 0-1 → em obras, 2-3 → tier 1, 4-5 → tier 2, 6+ → tier 3.
 */
export function tierFromTypeDiversity(
  distinctTypeCount: number,
  typesPerTier: TypesPerTier,
): Tier {
  if (!Number.isFinite(distinctTypeCount) || distinctTypeCount <= 0) {
    return TIER_UNDER_CONSTRUCTION;
  }
  return clampToTier(Math.floor(distinctTypeCount / typesPerTier));
}

/**
 * MODO ALTERNATIVO. Tier pelo valor acumulado, com limiares por categoria.
 * Passe `thresholds` para sobrescrever os defaults (limiares customizáveis por
 * usuário entram numa fase futura sem mudar esta assinatura).
 */
export function tierFromValue(
  valueCents: Cents,
  category: BuildingCategory,
  thresholds: CategoryThresholds = DEFAULT_VALUE_THRESHOLDS_CENTS[category],
): Tier {
  if (!Number.isFinite(valueCents) || valueCents < thresholds[0]) {
    return TIER_UNDER_CONSTRUCTION;
  }
  if (valueCents < thresholds[1]) return 1;
  if (valueCents < thresholds[2]) return 2;
  return MAX_TIER;
}

/**
 * Entrada da resolução de tier. A camada de projeção sempre fornece AMBAS as
 * métricas; qual delas manda é decidido pela configuração do usuário. Assim
 * trocar de regra em Configurações nunca precisa refazer a agregação.
 */
export interface TierInput {
  readonly category: BuildingCategory;
  /** Nº de tipos de lançamento distintos no prédio (modo diversidade). */
  readonly distinctTypeCount: number;
  /** Valor acumulado em centavos (modo valor). No hub, é o agregado da vila. */
  readonly valueCents: Cents;
}

export interface GrowthRule {
  readonly mode: GrowthMode;
  readonly typesPerTier: TypesPerTier;
  readonly valueThresholds?: Partial<Record<BuildingCategory, CategoryThresholds>>;
}

/** Ponto único de decisão do tier. Use este, não as funções individuais. */
export function resolveTier(input: TierInput, rule: GrowthRule): Tier {
  if (rule.mode === 'diversity') {
    return tierFromTypeDiversity(input.distinctTypeCount, rule.typesPerTier);
  }
  const override = rule.valueThresholds?.[input.category];
  return tierFromValue(
    input.valueCents,
    input.category,
    override ?? DEFAULT_VALUE_THRESHOLDS_CENTS[input.category],
  );
}

/** `true` se a categoria agrega o patrimônio da vila em vez de ter valor próprio. */
export function isAggregateCategory(category: BuildingCategory): boolean {
  return category === HUB_CATEGORY;
}

/**
 * Quantos tipos distintos ainda faltam para o próximo tier (modo diversidade).
 * Retorna `null` se já está no tier máximo. Usado pelo HUD da vila.
 */
export function typesUntilNextTier(
  distinctTypeCount: number,
  typesPerTier: TypesPerTier,
): number | null {
  const current = tierFromTypeDiversity(distinctTypeCount, typesPerTier);
  if (current >= MAX_TIER) return null;
  const needed = (current + 1) * typesPerTier;
  return Math.max(0, needed - Math.max(0, Math.floor(distinctTypeCount)));
}
