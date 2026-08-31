import { describe, expect, it } from 'vitest';
import {
  BUILDING_CATEGORIES,
  CATALOG_TIERS,
  CATEGORY_LABELS,
  ERA_LABELS,
  ERAS,
  getStructure,
  HUB_CATEGORY,
  isCatalogTier,
  STRUCTURE_CATALOG,
  TIER_UNDER_CONSTRUCTION,
} from '@/lib/village/catalog';

/**
 * O catálogo é dado, não lógica — mas é dado do qual a UI depende para não
 * quebrar. Um buraco (época sem uma categoria, tier faltando) só apareceria
 * como tela em branco em produção. Estes testes fecham essa porta.
 */
describe('catálogo da vila — integridade', () => {
  it('tem 5 épocas e 7 categorias', () => {
    expect(ERAS).toHaveLength(5);
    expect(BUILDING_CATEGORIES).toHaveLength(7);
  });

  it('tem estrutura para toda combinação época × categoria × tier (105)', () => {
    let count = 0;
    for (const era of ERAS) {
      for (const category of BUILDING_CATEGORIES) {
        for (const tier of CATALOG_TIERS) {
          const structure = STRUCTURE_CATALOG[era][category][tier];
          expect(structure, `${era}/${category}/${tier}`).toBeDefined();
          expect(structure.name.length).toBeGreaterThan(0);
          expect(structure.spriteId.length).toBeGreaterThan(0);
          count += 1;
        }
      }
    }
    expect(count).toBe(105);
  });

  it('não repete spriteId entre estruturas', () => {
    const ids = ERAS.flatMap((era) =>
      BUILDING_CATEGORIES.flatMap((category) =>
        CATALOG_TIERS.map((tier) => STRUCTURE_CATALOG[era][category][tier].spriteId),
      ),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tem rótulo PT-BR para toda época e categoria', () => {
    for (const era of ERAS) expect(ERA_LABELS[era]?.length).toBeGreaterThan(0);
    for (const category of BUILDING_CATEGORIES) {
      expect(CATEGORY_LABELS[category]?.length).toBeGreaterThan(0);
    }
  });

  it('usa cores como dado do catálogo, sempre em hexadecimal', () => {
    for (const era of ERAS) {
      for (const category of BUILDING_CATEGORIES) {
        for (const tier of CATALOG_TIERS) {
          const { badgeColor, pixelMatrixColor } = STRUCTURE_CATALOG[era][category][tier];
          expect(badgeColor).toMatch(/^#[0-9a-f]{6}$/i);
          expect(pixelMatrixColor).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    }
  });
});

describe('getStructure', () => {
  it('devolve null no tier 0 — o prédio está em obras', () => {
    for (const era of ERAS) {
      for (const category of BUILDING_CATEGORIES) {
        expect(getStructure(era, category, TIER_UNDER_CONSTRUCTION)).toBeNull();
      }
    }
  });

  it('devolve a estrutura da época pedida, não de outra', () => {
    const medieval = getStructure('medieval', 'casa', 3);
    const futurista = getStructure('futurista', 'casa', 3);
    expect(medieval?.name).toBe('Castelo de Pedra');
    expect(futurista?.name).toBe('Penthouse Megastrutura');
  });

  it('sobe de estrutura conforme o tier', () => {
    const nomes = CATALOG_TIERS.map((tier) => getStructure('moderno', 'locomocao', tier)?.name);
    expect(nomes).toEqual(['Bicicleta Urbana', 'Hatch Compacto', 'SUV Esportivo']);
  });
});

describe('isCatalogTier', () => {
  it('só o tier 0 fica de fora do catálogo', () => {
    expect(isCatalogTier(TIER_UNDER_CONSTRUCTION)).toBe(false);
    for (const tier of CATALOG_TIERS) expect(isCatalogTier(tier)).toBe(true);
  });
});

describe('hub', () => {
  it('é uma das categorias de prédio', () => {
    expect(BUILDING_CATEGORIES).toContain(HUB_CATEGORY);
  });
});
