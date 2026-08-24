/**
 * Blocos de validação reutilizados.
 *
 * PRINCÍPIO: nenhum dado do usuário chega ao banco sem passar por um schema
 * Zod. Server Actions recebem `FormData`, que é sempre `string | File` — a
 * validação é o único lugar onde isso vira um tipo confiável.
 */

import { z } from 'zod';
import { MAX_CENTS, parseAmountToCents } from '@/lib/money';
import { parseDateInput } from '@/lib/date';

export const cuid = z.string().min(1, 'Identificador inválido').max(64);

/**
 * Identificador opcional.
 *
 * ATENÇÃO (Zod 4): incluir `z.undefined()` num `union` NÃO torna a chave
 * opcional — uma chave ausente no objeto continua sendo erro. Quem marca a
 * chave como dispensável é `.optional()` / `.nullish()` aplicado ao schema.
 * Isso importa porque um `<select>` que não é renderizado (campo de destino
 * numa despesa, por exemplo) simplesmente não aparece no FormData.
 */
export const optionalCuid = z
  .union([cuid, z.literal('')])
  .nullish()
  .transform((v) => (v ? v : null));

/** Valor monetário digitado, convertido para centavos e validado. */
export const amountCents = z
  .string()
  .trim()
  .min(1, 'Informe um valor')
  .transform((value, ctx) => {
    const cents = parseAmountToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: 'custom', message: 'Valor inválido' });
      return z.NEVER;
    }
    return cents;
  })
  .pipe(
    z
      .number()
      .int()
      .refine((c) => Math.abs(c) <= MAX_CENTS, 'Valor alto demais'),
  );

/** Valor que precisa ser positivo (todo lançamento; o sinal vem do tipo). */
export const positiveAmountCents = amountCents.pipe(
  z.number().positive('O valor precisa ser maior que zero'),
);

/** Valor opcional (limite de cartão, renda, saldo inicial). */
export const optionalAmountCents = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const cents = parseAmountToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: 'custom', message: 'Valor inválido' });
      return z.NEVER;
    }
    if (Math.abs(cents) > MAX_CENTS) {
      ctx.addIssue({ code: 'custom', message: 'Valor alto demais' });
      return z.NEVER;
    }
    return cents;
  });

/** "2026-01-31" → Date em meia-noite UTC. */
export const dateInput = z
  .string()
  .trim()
  .min(1, 'Informe a data')
  .transform((value, ctx) => {
    const date = parseDateInput(value);
    if (!date) {
      ctx.addIssue({ code: 'custom', message: 'Data inválida' });
      return z.NEVER;
    }
    return date;
  });

export const optionalDateInput = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = parseDateInput(value);
    if (!date) {
      ctx.addIssue({ code: 'custom', message: 'Data inválida' });
      return z.NEVER;
    }
    return date;
  });

export const monthKey = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Competência inválida');

export const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida')
  .default('#5b6478');

export const shortText = (max: number, label: string) =>
  z.string().trim().min(1, `Informe ${label}`).max(max, `${label} é longo demais`);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'Texto longo demais')
    .optional()
    .transform((v) => (v ? v : null));

/**
 * Checkbox de HTML: presente = "on"/"true"/"1"; desmarcado não aparece no
 * FormData. Como acima, é `.optional()` que permite a chave ausente.
 */
export const checkbox = z
  .union([z.literal('on'), z.literal('true'), z.literal('1'), z.literal('off'), z.literal('')])
  .optional()
  .transform((v) => v === 'on' || v === 'true' || v === '1');
