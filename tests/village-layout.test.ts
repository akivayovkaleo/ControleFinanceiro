import { describe, expect, it } from 'vitest';
import { BUILDING_CATEGORIES, HUB_CATEGORY } from '@/lib/village/catalog';
import {
  buildingHref,
  parseBuildingCategory,
  VILLAGE_BUILDINGS,
  VILLAGE_GRID_SIZE,
  VILLAGE_PARAM,
} from '@/lib/village/layout';

describe('VILLAGE_BUILDINGS', () => {
  it('tem um prédio para cada categoria do catálogo', () => {
    expect(VILLAGE_BUILDINGS.map((b) => b.category)).toEqual([...BUILDING_CATEGORIES]);
  });

  it('não coloca dois prédios no mesmo tile', () => {
    const tiles = VILLAGE_BUILDINGS.map((b) => `${b.tileX}:${b.tileY}`);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('mantém todo prédio dentro do grid', () => {
    for (const building of VILLAGE_BUILDINGS) {
      expect(building.tileX).toBeGreaterThanOrEqual(0);
      expect(building.tileY).toBeGreaterThanOrEqual(0);
      expect(building.tileX).toBeLessThan(VILLAGE_GRID_SIZE);
      expect(building.tileY).toBeLessThan(VILLAGE_GRID_SIZE);
    }
  });

  it('põe o hub no centro — ele agrega os vizinhos', () => {
    const hub = VILLAGE_BUILDINGS.find((b) => b.category === HUB_CATEGORY)!;
    expect([hub.tileX, hub.tileY]).toEqual([1, 1]);
  });
});

describe('buildingHref', () => {
  it('manda o hub para o painel, que é a visão do todo', () => {
    expect(buildingHref('hub')).toBe('/painel');
    expect(buildingHref('hub', 'sp-1')).toBe('/painel?space=sp-1');
  });

  it('manda os demais para lançamentos filtrados pelo prédio', () => {
    expect(buildingHref('casa')).toBe(`/lancamentos?${VILLAGE_PARAM}=casa`);
    expect(buildingHref('saude', 'sp-1')).toBe(`/lancamentos?space=sp-1&${VILLAGE_PARAM}=saude`);
  });

  it('gera link válido para toda categoria', () => {
    for (const category of BUILDING_CATEGORIES) {
      expect(buildingHref(category, 'sp-1').startsWith('/')).toBe(true);
    }
  });
});

describe('parseBuildingCategory', () => {
  it('aceita todo prédio existente', () => {
    for (const category of BUILDING_CATEGORIES) {
      expect(parseBuildingCategory(category)).toBe(category);
    }
  });

  it('devolve null para qualquer coisa que não seja prédio', () => {
    expect(parseBuildingCategory('lazer')).toBeNull();
    expect(parseBuildingCategory('')).toBeNull();
    expect(parseBuildingCategory(null)).toBeNull();
    expect(parseBuildingCategory(undefined)).toBeNull();
    // Não pode virar filtro por acidente de prototype.
    expect(parseBuildingCategory('constructor')).toBeNull();
    expect(parseBuildingCategory('toString')).toBeNull();
  });
});
