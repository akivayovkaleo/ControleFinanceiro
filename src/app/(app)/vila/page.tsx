import type { Metadata } from 'next';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { getActiveSpace, firstParam, type SearchParams } from '@/lib/space-context';
import { getVillageState } from '@/server/queries/village';
import { ERA_LABELS, ERAS, TIER_UNDER_CONSTRUCTION } from '@/lib/village/catalog';
import { GROWTH_MODE_DESCRIPTIONS, GROWTH_MODE_LABELS, GROWTH_MODES } from '@/lib/village/growth';
import { buildingHref } from '@/lib/village/layout';
import {
  ERA_PARAM,
  GROWTH_PARAM,
  TYPES_PER_TIER_PARAM,
  growthRuleFromPreferences,
  parseVillagePreferences,
} from '@/lib/village/settings';
import { PageHeader } from '@/components/app/page-header';
import { VillageMap } from '@/components/village/village-map';
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Vila' };

export default async function VillagePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space } = context;

  const preferences = parseVillagePreferences({
    era: firstParam(params, ERA_PARAM),
    growthMode: firstParam(params, GROWTH_PARAM),
    typesPerTier: firstParam(params, TYPES_PER_TIER_PARAM),
  });

  const rule = growthRuleFromPreferences(preferences);
  const state = await getVillageState(space.id, rule, preferences.era);

  /** Link para esta mesma tela trocando um parâmetro e mantendo o resto. */
  const hrefWith = (overrides: Record<string, string>): string => {
    const next = new URLSearchParams({
      space: space.id,
      [ERA_PARAM]: preferences.era,
      [GROWTH_PARAM]: preferences.growthMode,
      [TYPES_PER_TIER_PARAM]: String(preferences.typesPerTier),
      ...overrides,
    });
    return `/vila?${next.toString()}`;
  };

  const construidos = state.buildings.filter(
    (b) => !b.isAggregate && b.tier !== TIER_UNDER_CONSTRUCTION,
  );

  return (
    <>
      <PageHeader
        title="Vila"
        description="Seus lançamentos vistos como um vilarejo. Cada prédio é um tipo de gasto, e ele cresce conforme você organiza — não conforme você gasta."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-muted">Patrimônio da vila</p>
          <Money cents={state.totalCents} currency={space.currency} tone="neutral" size="lg" />
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Prédios construídos</p>
          <p className="text-money font-semibold tabular text-fg">
            {construidos.length}
            <span className="text-base font-normal text-subtle"> de 6</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Regra de crescimento</p>
          <p className="text-money-sm font-semibold text-fg">
            {GROWTH_MODE_LABELS[preferences.growthMode]}
          </p>
        </div>
      </div>

      {state.isEmpty ? (
        <Card>
          <EmptyState
            icon={<Receipt className="h-6 w-6" aria-hidden />}
            title="A vila ainda é um canteiro de obras"
            description="Cada prédio nasce quando você registra lançamentos nas categorias dele. Um lançamento em Moradia levanta a casa; um em Transporte, a locomoção."
            action={
              <Link href={{ pathname: '/lancamentos/novo', query: { space: space.id } }}>
                <Button size="lg">Registrar um lançamento</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <VillageMap state={state} spaceId={space.id} currency={space.currency} />
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Preferências. São links, não formulário: a vila não guarda estado */}
      {/* — tudo mora na URL, então trocar de época é navegar.              */}
      {/* ---------------------------------------------------------------- */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Época"
            description="Puramente cosmético: troca o visual da vila inteira e não mexe em um centavo."
          />
          <CardBody className="flex flex-wrap gap-2 pt-4">
            {ERAS.map((era) => (
              <Link
                key={era}
                href={hrefWith({ [ERA_PARAM]: era })}
                aria-current={era === preferences.era ? 'true' : undefined}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm transition-colors',
                  era === preferences.era
                    ? 'border-brand-border bg-brand-soft font-medium text-brand'
                    : 'border-border bg-surface-2 text-muted hover:text-fg',
                )}
              >
                {ERA_LABELS[era]}
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Como os prédios crescem"
            description="O modo padrão premia organizar as finanças, não aumentar a despesa."
          />
          <CardBody className="space-y-2 pt-4">
            {GROWTH_MODES.map((mode) => (
              <Link
                key={mode}
                href={hrefWith({ [GROWTH_PARAM]: mode })}
                aria-current={mode === preferences.growthMode ? 'true' : undefined}
                className={cn(
                  'block rounded-lg border px-3 py-2.5 transition-colors',
                  mode === preferences.growthMode
                    ? 'border-brand-border bg-brand-soft'
                    : 'border-border bg-surface-2 hover:border-border-strong',
                )}
              >
                <span
                  className={cn(
                    'block text-sm font-medium',
                    mode === preferences.growthMode ? 'text-brand' : 'text-fg',
                  )}
                >
                  {GROWTH_MODE_LABELS[mode]}
                </span>
                <span className="mt-1 block text-[0.8125rem] leading-relaxed text-muted">
                  {GROWTH_MODE_DESCRIPTIONS[mode]}
                </span>
              </Link>
            ))}

            {preferences.growthMode === 'diversity' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[0.8125rem] text-muted">Categorias por nível:</span>
                {([1, 2, 3] as const).map((n) => (
                  <Link
                    key={n}
                    href={hrefWith({ [TYPES_PER_TIER_PARAM]: String(n) })}
                    aria-current={n === preferences.typesPerTier ? 'true' : undefined}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-sm tabular transition-colors',
                      n === preferences.typesPerTier
                        ? 'border-brand-border bg-brand-soft font-medium text-brand'
                        : 'border-border bg-surface-2 text-muted hover:text-fg',
                    )}
                  >
                    {n}
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Composição: de onde veio cada prédio. Sem isto a vila seria mágica,
          e ninguém confia num número que não sabe explicar. */}
      <Card className="mt-4">
        <CardHeader
          title="Do que cada prédio é feito"
          description="As categorias do espaço, agrupadas nos prédios que elas constroem."
        />
        <CardBody className="space-y-3 pt-4">
          {state.buildings.map((building) => (
            <div
              key={building.category}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">
                  {building.label}
                  <span className="ml-2 text-xs font-normal text-subtle">
                    {building.tier === TIER_UNDER_CONSTRUCTION
                      ? `em obras · vira ${building.nextStructure?.name ?? '—'}`
                      : `nível ${building.tier} · ${building.structure?.name ?? ''}`}
                  </span>
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                  {building.isAggregate
                    ? 'Soma a vila inteira — não tem categoria própria.'
                    : building.categories.length > 0
                      ? building.categories.map((c) => c.name).join(' · ')
                      : 'Nenhuma categoria com lançamento aqui ainda.'}
                </p>
                {building.typesUntilNextTier !== null && building.typesUntilNextTier > 0 && (
                  <p className="mt-1 text-xs text-subtle">
                    Faltam {building.typesUntilNextTier}{' '}
                    {building.typesUntilNextTier === 1 ? 'categoria' : 'categorias'} para o próximo
                    nível.
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Money
                  cents={building.valueCents}
                  currency={space.currency}
                  tone="neutral"
                  size="sm"
                />
                <Link
                  href={buildingHref(building.category, space.id)}
                  className="text-[0.8125rem] font-medium text-brand hover:underline"
                >
                  Ver
                </Link>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}
