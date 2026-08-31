import { describe, expect, it } from 'vitest';
import { BUILDING_CATEGORIES } from '@/lib/village/catalog';
import type { GrowthRule } from '@/lib/village/growth';
import {
  bucketForCategory,
  projectVillage,
  type VillageLedgerRow,
} from '@/lib/village/projection';

const diversity: GrowthRule = { mode: 'diversity', typesPerTier: 1 };
const byValue: GrowthRule = { mode: 'value', typesPerTier: 1 };

const row = (over: Partial<VillageLedgerRow> & { categoryId: string; name: string }): VillageLedgerRow => ({
  amountCents: 10_000,
  transactionCount: 1,
  ...over,
});

const buildingOf = (state: ReturnType<typeof projectVillage>, category: string) =>
  state.buildings.find((b) => b.category === category)!;

describe('bucketForCategory — categorias padrão do projeto', () => {
  it('encaixa os presets nos prédios certos', () => {
    expect(bucketForCategory({ name: 'Moradia', icon: 'home' })).toBe('casa');
    expect(bucketForCategory({ name: 'Contas de casa', icon: 'zap' })).toBe('casa');
    expect(bucketForCategory({ name: 'Internet e telefone', icon: 'wifi' })).toBe('casa');
    expect(bucketForCategory({ name: 'Transporte', icon: 'car' })).toBe('locomocao');
    expect(bucketForCategory({ name: 'Saúde', icon: 'heart-pulse' })).toBe('saude');
    expect(bucketForCategory({ name: 'Educação', icon: 'graduation-cap' })).toBe('estudos');
    expect(bucketForCategory({ name: 'Investimentos', icon: 'trending-up' })).toBe('investimentos');
    expect(bucketForCategory({ name: 'Viagem', icon: 'plane' })).toBe('locomocao');
  });

  it('manda para custom o que não é de nenhum prédio', () => {
    expect(bucketForCategory({ name: 'Mercado', icon: 'shopping-cart' })).toBe('custom');
    expect(bucketForCategory({ name: 'Restaurante e delivery', icon: 'utensils' })).toBe('custom');
    expect(bucketForCategory({ name: 'Lazer', icon: 'popcorn' })).toBe('custom');
    expect(bucketForCategory({ name: 'Pets', icon: 'paw-print' })).toBe('custom');
    expect(bucketForCategory({ name: 'Salário', icon: 'briefcase' })).toBe('custom');
  });

  it('não confunde "Taxas e impostos" com investimento por causa do ícone', () => {
    expect(bucketForCategory({ name: 'Taxas e impostos', icon: 'landmark' })).toBe('custom');
  });

  it('funciona sem ícone, só pelo nome', () => {
    expect(bucketForCategory({ name: 'Aluguel' })).toBe('casa');
    expect(bucketForCategory({ name: 'Farmácia' })).toBe('saude');
    expect(bucketForCategory({ name: 'Curso de inglês' })).toBe('estudos');
    expect(bucketForCategory({ name: 'Poupança' })).toBe('investimentos');
  });

  it('ignora acento e caixa', () => {
    expect(bucketForCategory({ name: 'SAÚDE' })).toBe('saude');
    expect(bucketForCategory({ name: 'educação' })).toBe('estudos');
    expect(bucketForCategory({ name: 'Pedágio' })).toBe('locomocao');
  });

  /**
   * "gasolina" contém "gas", e "gás" seria palavra de casa. A ordem das regras
   * é o que impede o combustível de virar conta de casa. Este teste existe
   * para que reordenar NAME_BUCKETS não passe despercebido.
   */
  it('classifica "Gasolina" como locomoção, não como conta de casa', () => {
    expect(bucketForCategory({ name: 'Gasolina' })).toBe('locomocao');
    expect(bucketForCategory({ name: 'Combustível' })).toBe('locomocao');
  });

  it('deixa o ícone explícito vencer o nome', () => {
    expect(bucketForCategory({ name: 'Aluguel', icon: 'car' })).toBe('locomocao');
  });

  it('nunca devolve o hub — ele não tem categoria própria', () => {
    const nomes = ['Hub', 'Central', 'Moradia', 'Qualquer coisa', ''];
    for (const name of nomes) expect(bucketForCategory({ name })).not.toBe('hub');
  });

  it('aceita ícone nulo ou ausente sem quebrar', () => {
    expect(bucketForCategory({ name: 'Aluguel', icon: null })).toBe('casa');
    expect(bucketForCategory({ name: 'Aluguel', icon: '' })).toBe('casa');
  });
});

describe('projectVillage — a vila lendo o ledger', () => {
  const rows: VillageLedgerRow[] = [
    row({ categoryId: 'c1', name: 'Moradia', icon: 'home', amountCents: 150_000, transactionCount: 3 }),
    row({ categoryId: 'c2', name: 'Contas de casa', icon: 'zap', amountCents: 40_000, transactionCount: 2 }),
    row({ categoryId: 'c3', name: 'Transporte', icon: 'car', amountCents: 30_000, transactionCount: 5 }),
    row({ categoryId: 'c4', name: 'Mercado', icon: 'shopping-cart', amountCents: 80_000, transactionCount: 9 }),
    // Criada mas nunca usada: não pode construir nada.
    row({ categoryId: 'c5', name: 'Lazer', icon: 'popcorn', amountCents: 20_000, transactionCount: 0 }),
  ];

  it('devolve os 7 prédios, na ordem canônica do catálogo', () => {
    const state = projectVillage(rows, diversity, 'moderno');
    expect(state.buildings.map((b) => b.category)).toEqual([...BUILDING_CATEGORIES]);
  });

  it('agrupa as categorias no prédio certo e soma o valor', () => {
    const state = projectVillage(rows, diversity, 'moderno');
    const casa = buildingOf(state, 'casa');

    expect(casa.distinctTypeCount).toBe(2);
    expect(casa.valueCents).toBe(190_000);
    expect(casa.categories.map((c) => c.categoryId).sort()).toEqual(['c1', 'c2']);
    expect(casa.tier).toBe(2);
  });

  it('não constrói com categoria que nunca recebeu lançamento', () => {
    const state = projectVillage(rows, diversity, 'moderno');
    const custom = buildingOf(state, 'custom');

    // Só "Mercado" conta; "Lazer" tem 0 lançamentos e ficou de fora.
    expect(custom.distinctTypeCount).toBe(1);
    expect(custom.categories.map((c) => c.categoryId)).toEqual(['c4']);
    expect(custom.valueCents).toBe(80_000);
  });

  it('deixa em obras o prédio sem nenhuma categoria', () => {
    const state = projectVillage(rows, diversity, 'moderno');
    const saude = buildingOf(state, 'saude');

    expect(saude.tier).toBe(0);
    expect(saude.structure).toBeNull();
    expect(saude.categories).toHaveLength(0);
    // Mostra o que o prédio VAI virar.
    expect(saude.nextStructure?.name).toBe('Posto de Saúde');
  });

  it('resolve a estrutura da época escolhida', () => {
    const moderno = buildingOf(projectVillage(rows, diversity, 'moderno'), 'casa');
    const medieval = buildingOf(projectVillage(rows, diversity, 'medieval'), 'casa');

    expect(moderno.structure?.name).toBe('Casa de Bairro');
    expect(medieval.structure?.name).toBe('Sobrado Enxaimel');
    // Trocar de época é cosmético: o tier e o dinheiro não mudam.
    expect(medieval.tier).toBe(moderno.tier);
    expect(medieval.valueCents).toBe(moderno.valueCents);
  });

  it('soma o patrimônio da vila sem contar o hub duas vezes', () => {
    const state = projectVillage(rows, diversity, 'moderno');
    expect(state.totalCents).toBe(190_000 + 30_000 + 80_000);

    const somaDosPredios = state.buildings
      .filter((b) => !b.isAggregate)
      .reduce((total, b) => total + b.valueCents, 0);
    expect(somaDosPredios).toBe(state.totalCents);
  });

  it('faz o hub crescer com quantos prédios saíram das obras', () => {
    const state = projectVillage(rows, diversity, 'moderno');
    const hub = buildingOf(state, 'hub');

    // casa, locomoção e custom estão construídos.
    expect(hub.distinctTypeCount).toBe(3);
    expect(hub.tier).toBe(3);
    expect(hub.valueCents).toBe(state.totalCents);
    expect(hub.isAggregate).toBe(true);
  });

  it('marca só o hub como agregado', () => {
    const state = projectVillage(rows, diversity, 'moderno');
    for (const building of state.buildings) {
      expect(building.isAggregate).toBe(building.category === 'hub');
    }
  });

  it('informa quantos tipos faltam no modo diversidade', () => {
    const state = projectVillage(rows, diversity, 'moderno');
    expect(buildingOf(state, 'saude').typesUntilNextTier).toBe(1);
    expect(buildingOf(state, 'casa').typesUntilNextTier).toBe(1);
    // Já no máximo.
    expect(buildingOf(state, 'hub').typesUntilNextTier).toBeNull();
  });

  it('não mostra progresso por tipos quando a regra é por valor', () => {
    const state = projectVillage(rows, byValue, 'moderno');
    for (const building of state.buildings) {
      expect(building.typesUntilNextTier).toBeNull();
    }
  });
});

describe('projectVillage — modo valor', () => {
  it('aplica limiares por categoria e agrega o hub', () => {
    const rows = [
      row({ categoryId: 'c1', name: 'Moradia', icon: 'home', amountCents: 20_000_000 }),
    ];
    const state = projectVillage(rows, byValue, 'moderno');

    // casa: [500_000, 15_000_000, 80_000_000] → R$ 200k cai no tier 2.
    expect(buildingOf(state, 'casa').tier).toBe(2);
    // hub:  [500_000, 10_000_000, 100_000_000] → o agregado também dá tier 2.
    expect(buildingOf(state, 'hub').tier).toBe(2);
    expect(state.totalCents).toBe(20_000_000);
  });
});

describe('projectVillage — espaço vazio', () => {
  it('sem nenhuma categoria, a vila inteira fica em obras', () => {
    const state = projectVillage([], diversity, 'moderno');

    expect(state.isEmpty).toBe(true);
    expect(state.totalCents).toBe(0);
    expect(state.buildings).toHaveLength(7);
    for (const building of state.buildings) {
      expect(building.tier).toBe(0);
      expect(building.structure).toBeNull();
      expect(building.valueCents).toBe(0);
    }
  });

  it('categorias criadas mas nunca usadas também deixam a vila vazia', () => {
    const rows = [
      row({ categoryId: 'c1', name: 'Moradia', transactionCount: 0 }),
      row({ categoryId: 'c2', name: 'Saúde', transactionCount: 0 }),
    ];
    const state = projectVillage(rows, diversity, 'moderno');

    expect(state.isEmpty).toBe(true);
    expect(state.totalCents).toBe(0);
    expect(buildingOf(state, 'casa').tier).toBe(0);
  });
});
