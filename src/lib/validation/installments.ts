/**
 * Validação de compra parcelada.
 *
 * Separada de `transactionSchema` de propósito: um parcelamento não é um
 * lançamento, é N lançamentos e um plano. Misturar os dois no mesmo schema
 * significaria campos que só valem às vezes — a fonte clássica de um formulário
 * que aceita combinação impossível.
 */

import { z } from 'zod';
import { MAX_INSTALLMENTS } from '@/lib/installments';
import { cuid, dateInput, optionalCuid, optionalText, positiveAmountCents, shortText } from './shared';
import { splitModes } from './finance';

export const installmentPurchaseSchema = z.object({
  spaceId: cuid,
  description: shortText(120, 'uma descrição'),
  /** O valor TOTAL da compra, não o da parcela. */
  totalCents: positiveAmountCents,
  count: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({ code: 'custom', message: 'Número de parcelas inválido' });
        return z.NEVER;
      }
      if (parsed < 2) {
        ctx.addIssue({ code: 'custom', message: 'Use pelo menos 2 parcelas' });
        return z.NEVER;
      }
      if (parsed > MAX_INSTALLMENTS) {
        ctx.addIssue({ code: 'custom', message: `O máximo é ${MAX_INSTALLMENTS} parcelas` });
        return z.NEVER;
      }
      return parsed;
    }),
  purchaseDate: dateInput,
  accountId: cuid,
  categoryId: optionalCuid,
  paidByMembershipId: optionalCuid,
  splitMode: z.enum(splitModes).default('OWNER'),
  notes: optionalText(500),
});

export const deleteInstallmentPlanSchema = z.object({
  spaceId: cuid,
  planId: cuid,
});
