/**
 * Tipos compartilhados entre Server Actions e componentes de cliente.
 *
 * Este arquivo é importado por código de CLIENTE (`useActionState`), então
 * não pode conter — nem importar — nada de servidor. Os helpers que usam
 * Zod, Prisma ou `next/headers` ficam em `result.ts`.
 */

export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  /** Dados úteis à UI depois do sucesso (id criado, código de convite…). */
  data?: Record<string, unknown>;
}

export const idleState: ActionState = { ok: false };
