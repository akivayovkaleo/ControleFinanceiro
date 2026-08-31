import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ERA,
  DEFAULT_GROWTH_MODE,
  DEFAULT_PREFERENCES,
  DEFAULT_TYPES_PER_TIER,
  growthRuleFromPreferences,
  parseVillagePreferences,
} from '@/lib/village/settings';

describe('parseVillagePreferences', () => {
  it('lê os três parâmetros quando são válidos', () => {
    expect(
      parseVillagePreferences({ era: 'medieval', growthMode: 'value', typesPerTier: '2' }),
    ).toEqual({ era: 'medieval', growthMode: 'value', typesPerTier: 2 });
  });

  it('aceita typesPerTier como número, não só como string da URL', () => {
    expect(parseVillagePreferences({ typesPerTier: 3 }).typesPerTier).toBe(3);
  });

  it('cai nos defaults quando não vem nada', () => {
    expect(parseVillagePreferences({})).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES).toEqual({
      era: DEFAULT_ERA,
      growthMode: DEFAULT_GROWTH_MODE,
      typesPerTier: DEFAULT_TYPES_PER_TIER,
    });
  });

  /**
   * A vila é decoração sobre uma tela que também mostra dinheiro. Um
   * `?era=jurassico` digitado à mão não pode virar erro 500.
   */
  it('nunca lança com valor inválido — cai no default', () => {
    expect(parseVillagePreferences({ era: 'jurassico' }).era).toBe(DEFAULT_ERA);
    expect(parseVillagePreferences({ growthMode: 'inflacao' }).growthMode).toBe(DEFAULT_GROWTH_MODE);
    expect(parseVillagePreferences({ typesPerTier: '99' }).typesPerTier).toBe(DEFAULT_TYPES_PER_TIER);
    expect(parseVillagePreferences({ typesPerTier: 'abc' }).typesPerTier).toBe(DEFAULT_TYPES_PER_TIER);
    expect(parseVillagePreferences({ era: null, growthMode: 42 })).toEqual(DEFAULT_PREFERENCES);
  });

  it('rejeita typesPerTier fora de 1..3, inclusive 0 e negativo', () => {
    for (const invalido of [0, -1, 4, 1.5]) {
      expect(parseVillagePreferences({ typesPerTier: invalido }).typesPerTier).toBe(
        DEFAULT_TYPES_PER_TIER,
      );
    }
  });

  it('o default é o modo canônico, não o modo por valor', () => {
    expect(DEFAULT_GROWTH_MODE).toBe('diversity');
  });
});

describe('growthRuleFromPreferences', () => {
  it('traduz preferências na regra que growth.ts espera', () => {
    const rule = growthRuleFromPreferences({
      era: 'futurista',
      growthMode: 'value',
      typesPerTier: 3,
    });
    expect(rule).toEqual({ mode: 'value', typesPerTier: 3 });
  });
});
