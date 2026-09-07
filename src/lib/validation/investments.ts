/**
 * Validação da carteira de investimentos.
 *
 * Como no resto do app, nada chega ao banco sem passar por aqui — `FormData` é
 * sempre `string | File`, e este é o único ponto onde isso vira tipo confiável.
 */

import { z } from 'zod';
import { cuid, optionalCuid, optionalText, positiveAmountCents, shortText } from './shared';
import { HOLDING_TYPES } from '@/lib/investments';

/**
 * Quantidade de cotas/unidades.
 *
 * **Não é dinheiro**, então não passa por `amountCents`: cripto tem 8 casas
 * decimais e fundo tem cota quebrada, e arredondar isso para centavo destruiria
 * a posição. Aceita vírgula ou ponto como separador, que é o que a pessoa
 * realmente digita.
 */
export const quantity = z
  .string()
  .trim()
  .min(1, 'Informe a quantidade')
  .transform((value, ctx) => {
    // Só um separador decimal, o último; o resto é ruído de digitação.
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = Number.parseFloat(cleaned);

    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: 'custom', message: 'Quantidade inválida' });
      return z.NEVER;
    }
    if (parsed <= 0) {
      ctx.addIssue({ code: 'custom', message: 'A quantidade precisa ser maior que zero' });
      return z.NEVER;
    }
    // Um número tão grande que perde precisão em ponto flutuante já não é uma
    // posição real — é erro de digitação, e é melhor recusar que guardar torto.
    if (parsed > Number.MAX_SAFE_INTEGER / 1e8) {
      ctx.addIssue({ code: 'custom', message: 'Quantidade alta demais' });
      return z.NEVER;
    }
    return parsed;
  });

export const holdingSchema = z.object({
  spaceId: cuid,
  holdingId: optionalCuid,
  accountId: cuid,
  name: shortText(80, 'um nome para a posição'),
  /** Opcional: nem toda posição tem ticker (CDB, poupança de corretora). */
  ticker: z
    .string()
    .trim()
    .max(20, 'Ticker longo demais')
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
  type: z.enum(HOLDING_TYPES as unknown as [string, ...string[]]),
  quantity,
  avgPriceCents: positiveAmountCents,
  currentPriceCents: positiveAmountCents,
  notes: optionalText(300),
});

export const deleteHoldingSchema = z.object({
  spaceId: cuid,
  holdingId: cuid,
});

/** Atualização rápida só da cotação, direto na lista. */
export const updateHoldingPriceSchema = z.object({
  spaceId: cuid,
  holdingId: cuid,
  currentPriceCents: positiveAmountCents,
});

export const captureSnapshotSchema = z.object({
  spaceId: cuid,
});
