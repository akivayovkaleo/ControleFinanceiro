/**
 * Validação de etiquetas.
 */

import { z } from 'zod';
import { cuid, hexColor, optionalCuid, shortText } from './shared';

export const tagSchema = z.object({
  spaceId: cuid,
  tagId: optionalCuid,
  name: shortText(40, 'um nome para a etiqueta'),
  color: hexColor,
});

export const deleteTagSchema = z.object({
  spaceId: cuid,
  tagId: cuid,
});

/**
 * Etiquetas de um lançamento, como lista de ids.
 *
 * Vem numa string separada por vírgula porque `FormData` não carrega array de
 * forma confiável entre um `<input hidden>` e o servidor. A chave é
 * `.optional()` e não uma união com `z.undefined()`: sem nenhuma etiqueta
 * marcada, o campo simplesmente não é enviado — e no Zod 4 quem permite a
 * chave ausente é `.optional()`, não o union (ver validation/shared.ts).
 */
export const setTransactionTagsSchema = z.object({
  spaceId: cuid,
  transactionId: cuid,
  tagIds: z
    .string()
    .optional()
    .transform((raw) => {
      if (!raw) return [] as string[];
      // Duplicata viraria erro de chave primária composta; some aqui.
      return Array.from(new Set(raw.split(',').map((id) => id.trim()).filter(Boolean)));
    })
    .pipe(z.array(cuid).max(20, 'Etiquetas demais num lançamento só')),
});
