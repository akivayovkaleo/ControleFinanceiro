import { describe, expect, it } from 'vitest';
import { BUILDING_CATEGORIES, TIER_UNDER_CONSTRUCTION } from '@/lib/village/catalog';
import {
  DEFAULT_VALUE_THRESHOLDS_CENTS,
  isAggregateCategory,
  MAX_TIER,
  resolveTier,
  tierFromTypeDiversity,
  tierFromValue,
  typesUntilNextTier,
  type GrowthRule,
} from '@/lib/village/growth';

const diversity = (typesPerTier: 1 | 2 | 3 = 1): GrowthRule => ({
  mode: 'diversity',
  typesPerTier,
});

const byValue: GrowthRule = { mode: 'value', typesPerTier: 1 };

describe('tierFromTypeDiversity — a regra canônica', () => {
  it('sem nenhum tipo registrado, o prédio fica em obras', () => {
    expect(tierFromTypeDiversity(0, 1)).toBe(TIER_UNDER_CONSTRUCTION);
  });

  it('com 1 tipo por nível, cada tipo novo sobe um tier', () => {
    expect(tierFromTypeDiversity(1, 1)).toBe(1);
    expect(tierFromTypeDiversity(2, 1)).toBe(2);
    expect(tierFromTypeDiversity(3, 1)).toBe(3);
  });

  it('com 2 tipos por nível, exige o dobro', () => {
    expect(tierFromTypeDiversity(1, 2)).toBe(0);
    expect(tierFromTypeDiversity(2, 2)).toBe(1);
    expect(tierFromTypeDiversity(3, 2)).toBe(1);
    expect(tierFromTypeDiversity(4, 2)).toBe(2);
    expect(tierFromTypeDiversity(6, 2)).toBe(3);
  });

  it('nunca passa do tier máximo, por mais tipos que existam', () => {
    expect(tierFromTypeDiversity(50, 1)).toBe(MAX_TIER);
    expect(tierFromTypeDiversity(999, 3)).toBe(MAX_TIER);
  });

  it('trata entrada inválida como prédio em obras, sem estourar', () => {
    expect(tierFromTypeDiversity(-5, 1)).toBe(0);
    expect(tierFromTypeDiversity(Number.NaN, 1)).toBe(0);
    expect(tierFromTypeDiversity(Number.POSITIVE_INFINITY, 1)).toBe(0);
  });
});

/**
 * O ponto do app inteiro: no modo canônico, gastar mais NÃO faz a vila
 * crescer. Se este teste cair, a gamificação virou um incentivo a torrar
 * dinheiro — exatamente o que ela existe para não ser.
 */
describe('regra anti-inflação', () => {
  it('no modo diversidade, o valor gasto não muda o tier', () => {
    const valores = [0, 1, 100_00, 1_000_000_00, Number.MAX_SAFE_INTEGER];

    for (const category of BUILDING_CATEGORIES) {
      const tiers = valores.map((valueCents) =>
        resolveTier({ category, distinctTypeCount: 2, valueCents }, diversity()),
      );
      expect(new Set(tiers).size, `categoria ${category}`).toBe(1);
      expect(tiers[0]).toBe(2);
    }
  });

  it('gastar uma fortuna numa categoria só mantém o prédio no tier 1', () => {
    const fortuna = resolveTier(
      { category: 'casa', distinctTypeCount: 1, valueCents: 500_000_000_00 },
      diversity(),
    );
    expect(fortuna).toBe(1);
  });

  it('organizar em 3 categorias sobe mais que gastar 1000x numa só', () => {
    const organizado = resolveTier(
      { category: 'casa', distinctTypeCount: 3, valueCents: 300_00 },
      diversity(),
    );
    const gastador = resolveTier(
      { category: 'casa', distinctTypeCount: 1, valueCents: 300_000_00 },
      diversity(),
    );
    expect(organizado).toBeGreaterThan(gastador);
  });
});

describe('tierFromValue — o modo alternativo', () => {
  it('usa limiares próprios de cada categoria', () => {
    // R$ 300,00 já constrói em saúde, mas não chega perto em casa.
    expect(tierFromValue(30_000, 'saude')).toBe(1);
    expect(tierFromValue(30_000, 'casa')).toBe(0);
  });

  it('respeita as três faixas da categoria', () => {
    const [t1, t2, t3] = DEFAULT_VALUE_THRESHOLDS_CENTS.saude;
    expect(tierFromValue(t1 - 1, 'saude')).toBe(0);
    expect(tierFromValue(t1, 'saude')).toBe(1);
    expect(tierFromValue(t2 - 1, 'saude')).toBe(1);
    expect(tierFromValue(t2, 'saude')).toBe(2);
    expect(tierFromValue(t3, 'saude')).toBe(3);
  });

  it('aceita limiares sobrescritos', () => {
    expect(tierFromValue(1_000, 'casa', [500, 1_000, 2_000])).toBe(2);
  });

  it('trata valor inválido como em obras', () => {
    expect(tierFromValue(Number.NaN, 'casa')).toBe(0);
  });

  it('tem limiares crescentes em toda categoria', () => {
    for (const category of BUILDING_CATEGORIES) {
      const [t1, t2, t3] = DEFAULT_VALUE_THRESHOLDS_CENTS[category];
      expect(t1, category).toBeLessThan(t2);
      expect(t2, category).toBeLessThan(t3);
      expect(Number.isInteger(t1), `${category} em centavos inteiros`).toBe(true);
    }
  });
});

describe('resolveTier — o ponto único de decisão', () => {
  it('no modo diversidade ignora o valor', () => {
    expect(
      resolveTier({ category: 'saude', distinctTypeCount: 0, valueCents: 9_000_000 }, diversity()),
    ).toBe(0);
  });

  it('no modo valor ignora a diversidade', () => {
    expect(
      resolveTier({ category: 'saude', distinctTypeCount: 9, valueCents: 0 }, byValue),
    ).toBe(0);
    expect(
      resolveTier({ category: 'saude', distinctTypeCount: 0, valueCents: 30_000 }, byValue),
    ).toBe(1);
  });

  it('aplica limiares customizados por categoria no modo valor', () => {
    const rule: GrowthRule = {
      mode: 'value',
      typesPerTier: 1,
      valueThresholds: { saude: [1, 2, 3] },
    };
    expect(resolveTier({ category: 'saude', distinctTypeCount: 0, valueCents: 3 }, rule)).toBe(3);
    // Categoria sem override continua no default.
    expect(resolveTier({ category: 'casa', distinctTypeCount: 0, valueCents: 3 }, rule)).toBe(0);
  });
});

describe('typesUntilNextTier — o HUD da vila', () => {
  it('diz quantos tipos faltam', () => {
    expect(typesUntilNextTier(0, 1)).toBe(1);
    expect(typesUntilNextTier(2, 1)).toBe(1);
    expect(typesUntilNextTier(0, 2)).toBe(2);
    expect(typesUntilNextTier(3, 2)).toBe(1);
  });

  it('devolve null quando o prédio já está no máximo', () => {
    expect(typesUntilNextTier(3, 1)).toBeNull();
    expect(typesUntilNextTier(99, 1)).toBeNull();
  });
});

describe('isAggregateCategory', () => {
  it('só o hub agrega a vila', () => {
    expect(isAggregateCategory('hub')).toBe(true);
    for (const category of BUILDING_CATEGORIES.filter((c) => c !== 'hub')) {
      expect(isAggregateCategory(category)).toBe(false);
    }
  });
});
