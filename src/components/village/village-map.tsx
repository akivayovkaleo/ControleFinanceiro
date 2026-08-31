/**
 * Mapa isométrico da vila.
 *
 * Grid em CSS puro. NÃO é o renderizador final — quando os sprites em pixel
 * art existirem, o motor de canvas entra no lugar deste componente sem que o
 * resto mude: o contrato de entrada (`VillageBuildingState[]`, já com tier e
 * estrutura resolvidos) é o definitivo.
 *
 * O componente é burro de propósito. Ele não decide tier, não soma dinheiro e
 * não conhece `spaceId` — só desenha o que `@/lib/village/projection` calculou.
 */

import Link from 'next/link';
import { formatCentsCompact } from '@/lib/money';
import { buildingHref } from '@/lib/village/layout';
import type { VillageBuildingState, VillageState } from '@/lib/village/projection';
import { VILLAGE_GRID_SIZE } from '@/lib/village/layout';
import { TIER_UNDER_CONSTRUCTION } from '@/lib/village/catalog';
import { cn } from '@/lib/utils';

const TILE_W = 112;
const TILE_H = 56;
const BUILDING_H = 76;

const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

/** Deslocamento para que o tile mais à esquerda comece em x = 0. */
const OFFSET_X = (VILLAGE_GRID_SIZE - 1) * HALF_W;
const MAP_W = (VILLAGE_GRID_SIZE - 1) * TILE_W + TILE_W;
const MAP_H = (VILLAGE_GRID_SIZE - 1) * TILE_H + TILE_H + BUILDING_H;

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

function isoX(tileX: number, tileY: number): number {
  return (tileX - tileY) * HALF_W + OFFSET_X;
}

function isoY(tileX: number, tileY: number): number {
  return (tileX + tileY) * HALF_H;
}

/** O que o leitor de tela anuncia ao chegar num prédio. */
function buildingLabel(building: VillageBuildingState): string {
  if (building.tier === TIER_UNDER_CONSTRUCTION) {
    const virara = building.nextStructure?.name;
    return virara
      ? `${building.label} — em obras. Vai virar ${virara}.`
      : `${building.label} — em obras.`;
  }
  return `${building.label} — ${building.structure?.name ?? ''}, nível ${building.tier}`;
}

export function VillageMap({
  state,
  spaceId,
  currency,
}: {
  state: VillageState;
  spaceId: string;
  currency: string;
}) {
  const occupied = new Set(state.buildings.map((b) => `${b.tileX}:${b.tileY}`));
  const emptyTiles: Array<{ tileX: number; tileY: number }> = [];
  for (let tileX = 0; tileX < VILLAGE_GRID_SIZE; tileX += 1) {
    for (let tileY = 0; tileY < VILLAGE_GRID_SIZE; tileY += 1) {
      if (!occupied.has(`${tileX}:${tileY}`)) emptyTiles.push({ tileX, tileY });
    }
  }

  return (
    <div
      data-era={state.era}
      className="overflow-hidden rounded-2xl border border-era-line bg-era-canvas"
    >
      <div className="flex w-full items-center justify-center overflow-x-auto p-4 sm:p-6">
        <div className="relative shrink-0" style={{ width: MAP_W, height: MAP_H }}>
          {/* Terreno vazio */}
          {emptyTiles.map(({ tileX, tileY }) => (
            <div
              key={`empty-${tileX}-${tileY}`}
              aria-hidden
              className="absolute bg-era-ground-alt/50"
              style={{
                left: isoX(tileX, tileY),
                top: isoY(tileX, tileY) + BUILDING_H,
                width: TILE_W,
                height: TILE_H,
                clipPath: DIAMOND,
                zIndex: tileX + tileY,
              }}
            />
          ))}

          {/* Prédios */}
          {state.buildings.map((building) => {
            const underConstruction = building.structure === null;
            const icon = underConstruction ? '🚧' : (building.structure?.icon ?? '🏗️');

            return (
              <Link
                key={building.category}
                href={buildingHref(building.category, spaceId)}
                aria-label={buildingLabel(building)}
                className="group absolute focus-visible:outline-none"
                style={{
                  left: isoX(building.tileX, building.tileY),
                  top: isoY(building.tileX, building.tileY),
                  width: TILE_W,
                  height: TILE_H + BUILDING_H,
                  zIndex: 10 + building.tileX + building.tileY,
                }}
              >
                {/* Base isométrica */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute bottom-0 left-0 w-full transition-[filter]',
                    'group-hover:brightness-125 group-focus-visible:brightness-125',
                    building.isAggregate ? 'bg-era-accent' : 'bg-era-ground',
                  )}
                  style={{ height: TILE_H, clipPath: DIAMOND }}
                />

                {/* Estrutura.
                    As cores vêm do catálogo (`badgeColor`/`pixelMatrixColor`),
                    que é DADO — a paleta provisória no lugar dos sprites. Não
                    são tokens de tema; ver o cabeçalho de lib/village/catalog. */}
                <span
                  aria-hidden
                  className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
                  style={{ bottom: HALF_H }}
                >
                  {underConstruction ? (
                    <span className="flex size-12 items-center justify-center rounded-md border-2 border-dashed border-era-muted/70 bg-era-surface-2/80 text-xl">
                      {icon}
                    </span>
                  ) : (
                    <span
                      className="flex size-12 items-center justify-center rounded-md border-2 text-xl shadow-lg"
                      style={{
                        backgroundColor: building.structure!.pixelMatrixColor,
                        borderColor: building.structure!.badgeColor,
                      }}
                    >
                      {icon}
                    </span>
                  )}
                </span>

                {/* Etiqueta */}
                <span
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-era-canvas/85 px-1.5 py-0.5 text-[10px] font-medium text-era-ink"
                  style={{ bottom: -6 }}
                >
                  {building.label}
                  {underConstruction ? (
                    <span className="text-era-muted"> · em obras</span>
                  ) : (
                    building.valueCents > 0 && (
                      <span className="text-era-muted">
                        {' · '}
                        {formatCentsCompact(building.valueCents, currency)}
                      </span>
                    )
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
