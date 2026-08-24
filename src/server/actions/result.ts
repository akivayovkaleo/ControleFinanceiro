/**
 * Formato de retorno das Server Actions.
 *
 * Toda action devolve o mesmo shape, consumido por `useActionState` na UI.
 * Erros de validação vêm por campo (`fieldErrors`) para aparecerem embaixo do
 * input certo; erros gerais vêm em `error`.
 *
 * NUNCA devolva a mensagem crua de uma exceção para o usuário: ela pode
 * conter caminho de arquivo, SQL ou nome de coluna. Erros inesperados viram
 * uma mensagem genérica e são logados no servidor.
 */

import { z } from 'zod';
import { AuthorizationError, KnownError } from '@/lib/errors';
import type { ActionState } from './types';

export { KnownError };
export { idleState } from './types';
export type { ActionState };

export function success(message?: string, data?: Record<string, unknown>): ActionState {
  return { ok: true, message, data };
}

export function failure(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}

/** Converte um ZodError no formato de `fieldErrors`. */
export function zodToFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/**
 * Valida FormData contra um schema, devolvendo os dados ou um ActionState de
 * erro pronto para retornar.
 */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.output<S> } | { ok: false; state: ActionState } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    raw[key] = value;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = zodToFieldErrors(parsed.error);
    const messages = Object.values(fieldErrors);

    // Quando há um único problema, mostramos a mensagem dele em vez do
    // genérico "confira os campos". Isso importa quando o erro cai num campo
    // que o formulário não renderiza — sem isso, a pessoa lê "confira os
    // campos destacados" sem nenhum campo destacado na tela.
    return {
      ok: false,
      state: failure(
        messages.length === 1 ? messages[0]! : 'Confira os campos destacados.',
        fieldErrors,
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Envolve o corpo de uma action, traduzindo exceções conhecidas e escondendo
 * as desconhecidas.
 *
 * Cuidado: `redirect()` do Next funciona lançando uma exceção especial. Ela
 * precisa passar direto, ou o redirecionamento vira "erro inesperado".
 */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (error) {
    if (isNextControlFlow(error)) throw error;

    if (error instanceof AuthorizationError) {
      return failure(error.message);
    }
    if (error instanceof z.ZodError) {
      return failure('Confira os campos destacados.', zodToFieldErrors(error));
    }
    if (error instanceof KnownError) {
      return failure(error.message, error.fieldErrors);
    }

    console.error('[action] erro inesperado:', error);
    return failure('Algo deu errado. Tente de novo em instantes.');
  }
}

/**
 * `redirect()` e `notFound()` sinalizam via exceção com a marca `digest`.
 * Reconhecê-las evita engolir o controle de fluxo do framework.
 */
function isNextControlFlow(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest: unknown }).digest === 'string' &&
    ((error as { digest: string }).digest.startsWith('NEXT_REDIRECT') ||
      (error as { digest: string }).digest === 'NEXT_NOT_FOUND')
  );
}
