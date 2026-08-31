/**
 * Preferências da vila — época, regra de crescimento e granularidade do tier.
 *
 * Nada aqui altera regra de negócio do ledger. `era` é puramente cosmético e
 * `growthMode`/`typesPerTier` afetam apenas a PROJEÇÃO visual do dado
 * financeiro. Trocar qualquer um dos três não muda um centavo de lugar.
 *
 * ---------------------------------------------------------------------------
 * ONDE ISTO MORA HOJE
 * ---------------------------------------------------------------------------
 * Na query string de `/vila` (`?era=medieval&crescimento=diversity`), não no
 * banco. Foi uma escolha deliberada: persistir exigiria três colunas novas em
 * `User` e uma migration, e a vila ainda é uma camada de leitura sobre o
 * ledger — nada que ela guarde é dado financeiro. Quando virar preferência de
 * verdade, `parseVillagePreferences` continua sendo o ponto único de
 * validação; só muda quem alimenta o objeto cru.
 *
 * A convenção do Zod 4 do projeto vale aqui também: `.optional()` é o que
 * torna a chave dispensável — `z.undefined()` num union NÃO faz isso.
 * Ver a armadilha documentada em `CLAUDE.md` e os testes em
 * `tests/validation.test.ts`.
 */

import { z } from 'zod';
import { ERAS, type Era } from '@/lib/village/catalog';
import {
  GROWTH_MODES,
  TYPES_PER_TIER_OPTIONS,
  type GrowthMode,
  type TypesPerTier,
} from '@/lib/village/growth';

export const DEFAULT_ERA: Era = 'moderno';
export const DEFAULT_GROWTH_MODE: GrowthMode = 'diversity';
export const DEFAULT_TYPES_PER_TIER: TypesPerTier = 1;

/** Nomes dos parâmetros na URL. Em português, como as rotas do projeto. */
export const ERA_PARAM = 'era';
export const GROWTH_PARAM = 'crescimento';
export const TYPES_PER_TIER_PARAM = 'porNivel';

export interface VillagePreferences {
  readonly era: Era;
  readonly growthMode: GrowthMode;
  readonly typesPerTier: TypesPerTier;
}

export const DEFAULT_PREFERENCES: VillagePreferences = {
  era: DEFAULT_ERA,
  growthMode: DEFAULT_GROWTH_MODE,
  typesPerTier: DEFAULT_TYPES_PER_TIER,
};

export const eraSchema = z.enum(ERAS);
export const growthModeSchema = z.enum(GROWTH_MODES);
export const typesPerTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/**
 * Lê as preferências de uma fonte crua (query string, formulário, linha de
 * banco). NUNCA lança: um parâmetro inválido cai no default em vez de derrubar
 * a tela. A vila é decoração — um `?era=jurassico` digitado à mão não pode
 * virar erro 500 numa tela que também mostra saldo.
 */
export function parseVillagePreferences(raw: {
  era?: unknown;
  growthMode?: unknown;
  typesPerTier?: unknown;
}): VillagePreferences {
  const era = eraSchema.safeParse(raw.era);
  const growthMode = growthModeSchema.safeParse(raw.growthMode);

  // A URL entrega string; o schema exige o literal numérico.
  const rawTypes =
    typeof raw.typesPerTier === 'string' ? Number(raw.typesPerTier) : raw.typesPerTier;
  const typesPerTier = typesPerTierSchema.safeParse(rawTypes);

  return {
    era: era.success ? era.data : DEFAULT_ERA,
    growthMode: growthMode.success ? growthMode.data : DEFAULT_GROWTH_MODE,
    typesPerTier: typesPerTier.success ? typesPerTier.data : DEFAULT_TYPES_PER_TIER,
  };
}

/** A regra de crescimento no formato que `@/lib/village/growth` espera. */
export function growthRuleFromPreferences(preferences: VillagePreferences): {
  mode: GrowthMode;
  typesPerTier: TypesPerTier;
} {
  return { mode: preferences.growthMode, typesPerTier: preferences.typesPerTier };
}

export { TYPES_PER_TIER_OPTIONS };
