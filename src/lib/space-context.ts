/**
 * Resolução do espaço ativo.
 *
 * O espaço vive na query string (`?space=…`) e cai para o último usado quando
 * ela não está presente. Foi escolhido assim em vez de `/e/[spaceId]/...`
 * porque mantém as URLs curtas e legíveis ("/lancamentos" em vez de
 * "/e/clx123.../lancamentos") e porque a troca de espaço é rara — quase sempre
 * a pessoa quer continuar no mesmo de antes.
 */

import 'server-only';
import { requireSpace, resolveDefaultSpaceId, requireUser, type SpaceContext } from '@/lib/auth/guard';

export type SearchParams = Record<string, string | string[] | undefined>;

/** Primeiro valor de um parâmetro que pode vir repetido. */
export function firstParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Carrega o espaço ativo já validando a associação do usuário.
 * Se o `?space=` apontar para um espaço que não é do usuário, cai para o
 * padrão em vez de estourar — assim um link antigo ou compartilhado por
 * engano não vira uma tela de erro.
 */
export async function getActiveSpace(searchParams: SearchParams): Promise<SpaceContext> {
  const user = await requireUser();
  const requested = firstParam(searchParams, 'space');

  if (requested) {
    try {
      return await requireSpace(requested);
    } catch {
      // segue para o padrão
    }
  }

  const spaceId = await resolveDefaultSpaceId(user);
  return requireSpace(spaceId);
}

/** Monta uma URL preservando o espaço ativo. */
export function spaceHref(path: string, spaceId: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ space: spaceId, ...extra });
  return `${path}?${params.toString()}`;
}
