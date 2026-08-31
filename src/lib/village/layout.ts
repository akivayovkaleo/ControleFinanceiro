/**
 * Layout do vilarejo e para onde cada prédio leva.
 *
 * Os prédios da vila NÃO são telas novas. Cada um é um atalho para a mesma
 * tela de lançamentos que já existe, filtrada pelo bucket daquele prédio.
 * Essa é a regra que impede a vila de virar um segundo app: ela é uma
 * apresentação do ledger, nunca uma cópia dele.
 */

import {
  BUILDING_CATEGORIES,
  CATEGORY_LABELS,
  HUB_CATEGORY,
  type BuildingCategory,
} from '@/lib/village/catalog';

/** Query param que filtra `/lancamentos` pelo bucket de um prédio. */
export const VILLAGE_PARAM = 'vila';

/**
 * Valida um `?vila=` cru. Devolve `null` para qualquer coisa que não seja
 * um prédio — a tela então simplesmente não filtra, em vez de estourar.
 */
export function parseBuildingCategory(raw: string | null | undefined): BuildingCategory | null {
  if (!raw) return null;
  return BUILDING_CATEGORIES.find((category) => category === raw) ?? null;
}

/**
 * Para onde o interior de um prédio aponta.
 *
 * O hub agrega a vila inteira, então abre o painel. Qualquer outro prédio
 * abre `/lancamentos` filtrado pelo seu bucket.
 */
export function buildingHref(category: BuildingCategory, spaceId?: string): string {
  const params = new URLSearchParams();
  if (spaceId) params.set('space', spaceId);

  if (category === HUB_CATEGORY) {
    const query = params.toString();
    return query ? `/painel?${query}` : '/painel';
  }

  params.set(VILLAGE_PARAM, category);
  return `/lancamentos?${params.toString()}`;
}

export interface VillageBuilding {
  readonly category: BuildingCategory;
  readonly label: string;
  /** Posição no grid isométrico. */
  readonly tileX: number;
  readonly tileY: number;
}

/**
 * Layout padrão num grid 3×3, hub no centro — ele agrega os vizinhos, então
 * fica no meio deles. As posições viram dado por espaço quando a vila ficar
 * editável; por enquanto o mapa é o mesmo para todo mundo.
 */
const DEFAULT_TILES: Record<BuildingCategory, { tileX: number; tileY: number }> = {
  casa: { tileX: 0, tileY: 0 },
  locomocao: { tileX: 1, tileY: 0 },
  investimentos: { tileX: 2, tileY: 0 },
  estudos: { tileX: 0, tileY: 1 },
  hub: { tileX: 1, tileY: 1 },
  saude: { tileX: 2, tileY: 1 },
  custom: { tileX: 1, tileY: 2 },
};

export const VILLAGE_GRID_SIZE = 3;

export const VILLAGE_BUILDINGS: readonly VillageBuilding[] = BUILDING_CATEGORIES.map(
  (category) => ({
    category,
    label: CATEGORY_LABELS[category],
    tileX: DEFAULT_TILES[category].tileX,
    tileY: DEFAULT_TILES[category].tileY,
  }),
);
