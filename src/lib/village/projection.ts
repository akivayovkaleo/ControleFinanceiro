/**
 * A ponte entre o ledger e a vila.
 *
 * O protótipo original não tinha esta camada: ele não conhecia lançamento
 * nenhum, então todo prédio nascia e morria em "obras". Aqui é onde a vila
 * finalmente lê o dado financeiro de verdade.
 *
 * ---------------------------------------------------------------------------
 * O QUE ESTE ARQUIVO DECIDE
 * ---------------------------------------------------------------------------
 * 1. Em qual prédio cada `Category` do espaço cai (`bucketForCategory`).
 * 2. Qual tier cada prédio atinge com o que o espaço realmente registrou
 *    (`projectVillage`), aplicando a regra anti-inflação de
 *    `@/lib/village/growth`.
 *
 * Tudo aqui é PURO: recebe linhas já lidas do banco e devolve o estado da
 * vila. Nenhuma consulta, nenhum `spaceId` — quem filtra por espaço é
 * `@/server/queries/village`, como manda a regra 2 do projeto.
 */

import type { Cents } from '@/lib/money';
import {
  CATEGORY_LABELS,
  getStructure,
  HUB_CATEGORY,
  TIER_UNDER_CONSTRUCTION,
  type BuildingCategory,
  type Era,
  type StructureDef,
  type Tier,
} from '@/lib/village/catalog';
import { resolveTier, typesUntilNextTier, type GrowthRule } from '@/lib/village/growth';
import { VILLAGE_BUILDINGS } from '@/lib/village/layout';

/**
 * Minúsculas e sem acento, para casar "Saúde" com "saude".
 * `̀-ͯ` é o bloco de marcas diacríticas combinantes que o NFD separa.
 */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Ícones (slugs do lucide) que identificam um bucket sem ambiguidade.
 *
 * `landmark` fica de fora de propósito: no preset ele é "Taxas e impostos",
 * não investimento.
 */
const ICON_BUCKETS: ReadonlyArray<readonly [BuildingCategory, readonly string[]]> = [
  ['saude', ['heart-pulse', 'stethoscope', 'pill', 'cross', 'dumbbell', 'activity']],
  ['estudos', ['graduation-cap', 'book', 'book-open', 'library', 'school']],
  ['locomocao', ['car', 'bus', 'train', 'plane', 'bike', 'fuel', 'truck', 'ship']],
  ['investimentos', ['trending-up', 'piggy-bank', 'coins', 'chart-line']],
  ['casa', ['home', 'house', 'zap', 'wifi', 'lightbulb', 'droplet', 'plug', 'sofa', 'bed']],
];

/**
 * Palavras que identificam um bucket pelo NOME da categoria.
 *
 * A ORDEM IMPORTA e não é alfabética: `locomocao` vem antes de `casa` porque
 * "gasolina" contém "gas". Mexer na ordem sem rodar os testes quebra isso.
 *
 * "Viagem" cai em locomoção: a vila não tem prédio de lazer, e viagem é
 * deslocamento. É um julgamento, não uma verdade — está fixado em teste para
 * que mudar de ideia seja uma decisão explícita.
 */
const NAME_BUCKETS: ReadonlyArray<readonly [BuildingCategory, readonly string[]]> = [
  [
    'saude',
    [
      'saude', 'medic', 'farmacia', 'dentista', 'academia',
      'psicolog', 'terapia', 'hospital', 'exame',
    ],
  ],
  [
    'estudos',
    ['educac', 'estudo', 'curso', 'faculdade', 'escola', 'livro', 'universidade', 'ingles'],
  ],
  [
    'locomocao',
    [
      'transporte', 'carro', 'combustivel', 'gasolina', 'uber', 'onibus', 'metro',
      'passagem', 'moto', 'bicicleta', 'estacionamento', 'pedagio', 'viagem',
    ],
  ],
  [
    'investimentos',
    [
      'investiment', 'poupanca', 'aporte', 'renda fixa',
      'acoes', 'tesouro', 'cripto', 'previdencia',
    ],
  ],
  [
    'casa',
    [
      'moradia', 'aluguel', 'casa', 'condominio', 'internet', 'telefone',
      'luz', 'agua', 'energia', 'iptu', 'reforma', 'movel',
    ],
  ],
];

/**
 * Em qual prédio uma categoria do ledger cai.
 *
 * O ícone manda quando é conclusivo (o usuário escolheu um símbolo explícito);
 * senão vale o nome. Nada que sobra é erro: cai em `custom`, que é o prédio
 * das categorias que a pessoa inventou — a maioria, num app real.
 *
 * Nunca devolve `hub`: o hub não tem categoria própria, ele soma a vila.
 */
export function bucketForCategory(category: {
  name: string;
  icon?: string | null;
}): BuildingCategory {
  const icon = normalize(category.icon ?? '');
  if (icon) {
    for (const [bucket, slugs] of ICON_BUCKETS) {
      if (slugs.includes(icon)) return bucket;
    }
  }

  const name = normalize(category.name);
  for (const [bucket, keywords] of NAME_BUCKETS) {
    if (keywords.some((keyword) => name.includes(keyword))) return bucket;
  }

  return 'custom';
}

/** Uma categoria do espaço, já somada. É o que a projeção consome. */
export interface VillageLedgerRow {
  readonly categoryId: string;
  readonly name: string;
  readonly icon?: string | null;
  /** Total movimentado na categoria, em centavos. */
  readonly amountCents: Cents;
  readonly transactionCount: number;
}

/** Uma categoria já atribuída a um prédio, para a UI explicar a composição. */
export interface VillageCategoryRef {
  readonly categoryId: string;
  readonly name: string;
  readonly amountCents: Cents;
  readonly transactionCount: number;
}

export interface VillageBuildingState {
  readonly category: BuildingCategory;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tier: Tier;
  /** `null` quando em obras — o mapa desenha o canteiro. */
  readonly structure: StructureDef | null;
  /** O que o prédio VAI virar no tier 1. Usado no rótulo de "em obras". */
  readonly nextStructure: StructureDef | null;
  readonly valueCents: Cents;
  /** Categorias distintas COM lançamento neste prédio. */
  readonly distinctTypeCount: number;
  /** Quantas faltam para o próximo tier. `null` no tier máximo ou no modo valor. */
  readonly typesUntilNextTier: number | null;
  readonly categories: readonly VillageCategoryRef[];
  /** `true` para o hub, que agrega a vila em vez de ter valor próprio. */
  readonly isAggregate: boolean;
}

export interface VillageState {
  readonly era: Era;
  readonly buildings: readonly VillageBuildingState[];
  /** Patrimônio projetado da vila: a soma dos prédios não-hub. */
  readonly totalCents: Cents;
  /** `true` quando o espaço ainda não tem nenhum lançamento. */
  readonly isEmpty: boolean;
}

/**
 * Projeta o ledger na vila.
 *
 * Uma categoria só conta para a diversidade se tiver ao menos um lançamento.
 * Criar vinte categorias vazias não sobe prédio nenhum — o que faz a vila
 * crescer é USAR a organização, não declará-la.
 *
 * O hub é resolvido por último e com métricas próprias: seu valor é o
 * agregado da vila e sua "diversidade" é quantos prédios já saíram das obras.
 * Por isso ele não pode ser calculado junto com os outros.
 */
export function projectVillage(
  rows: readonly VillageLedgerRow[],
  rule: GrowthRule,
  era: Era,
): VillageState {
  const grouped = new Map<BuildingCategory, VillageCategoryRef[]>();

  for (const row of rows) {
    if (row.transactionCount <= 0) continue;
    const bucket = bucketForCategory(row);
    const list = grouped.get(bucket) ?? [];
    list.push({
      categoryId: row.categoryId,
      name: row.name,
      amountCents: row.amountCents,
      transactionCount: row.transactionCount,
    });
    grouped.set(bucket, list);
  }

  const showProgress = rule.mode === 'diversity';

  // 1a passada: os prédios que têm categorias próprias.
  const regular = VILLAGE_BUILDINGS.filter((b) => b.category !== HUB_CATEGORY).map((building) => {
    const categories = grouped.get(building.category) ?? [];
    const valueCents = categories.reduce((total, c) => total + c.amountCents, 0);
    const distinctTypeCount = categories.length;
    const tier = resolveTier({ category: building.category, distinctTypeCount, valueCents }, rule);

    return buildState({
      building,
      tier,
      valueCents,
      distinctTypeCount,
      categories,
      era,
      showProgress,
      rule,
      isAggregate: false,
    });
  });

  // 2a passada: o hub agrega o que a 1a produziu.
  const totalCents = regular.reduce((total, b) => total + b.valueCents, 0);
  const builtCount = regular.filter((b) => b.tier !== TIER_UNDER_CONSTRUCTION).length;

  const hubBuilding = VILLAGE_BUILDINGS.find((b) => b.category === HUB_CATEGORY)!;
  const hub = buildState({
    building: hubBuilding,
    tier: resolveTier(
      { category: HUB_CATEGORY, distinctTypeCount: builtCount, valueCents: totalCents },
      rule,
    ),
    valueCents: totalCents,
    distinctTypeCount: builtCount,
    categories: [],
    era,
    showProgress,
    rule,
    isAggregate: true,
  });

  // Devolve na ordem canônica do catálogo, com o hub no lugar dele.
  const byCategory = new Map<BuildingCategory, VillageBuildingState>(
    [...regular, hub].map((b) => [b.category, b]),
  );

  return {
    era,
    buildings: VILLAGE_BUILDINGS.map((b) => byCategory.get(b.category)!),
    totalCents,
    isEmpty: rows.every((row) => row.transactionCount <= 0),
  };
}

function buildState(input: {
  building: { category: BuildingCategory; tileX: number; tileY: number };
  tier: Tier;
  valueCents: Cents;
  distinctTypeCount: number;
  categories: readonly VillageCategoryRef[];
  era: Era;
  showProgress: boolean;
  rule: GrowthRule;
  isAggregate: boolean;
}): VillageBuildingState {
  const { building, tier, era, rule } = input;

  return {
    category: building.category,
    label: CATEGORY_LABELS[building.category],
    tileX: building.tileX,
    tileY: building.tileY,
    tier,
    structure: getStructure(era, building.category, tier),
    nextStructure: getStructure(era, building.category, 1),
    valueCents: input.valueCents,
    distinctTypeCount: input.distinctTypeCount,
    typesUntilNextTier: input.showProgress
      ? typesUntilNextTier(input.distinctTypeCount, rule.typesPerTier)
      : null,
    categories: input.categories,
    isAggregate: input.isAggregate,
  };
}
