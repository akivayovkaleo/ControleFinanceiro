/**
 * Schemas das entidades financeiras.
 *
 * Cada um valida exatamente o que a Server Action correspondente recebe do
 * formulário. Regras que envolvem mais de um campo (transferência precisa de
 * conta destino, divisão personalizada precisa dos valores) ficam em
 * `superRefine`, para que a mensagem apareça no campo certo.
 */

import { z } from 'zod';
import {
  checkbox,
  cuid,
  dateInput,
  hexColor,
  monthKey,
  optionalAmountCents,
  optionalCuid,
  optionalDateInput,
  optionalText,
  positiveAmountCents,
  shortText,
} from './shared';

// ---------------------------------------------------------------- spaces

export const createSpaceSchema = z.object({
  name: shortText(60, 'um nome para o espaço'),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
});

export const updateSpaceSchema = z.object({
  spaceId: cuid,
  name: shortText(60, 'um nome para o espaço'),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
  monthStartDay: z.coerce.number().int().min(1).max(28).default(1),
});

export const updateMemberSchema = z.object({
  spaceId: cuid,
  membershipId: cuid,
  displayName: shortText(40, 'como você aparece neste espaço'),
  color: hexColor,
  monthlyIncomeCents: optionalAmountCents,
});

export const joinSpaceSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(6, 'O código tem 12 caracteres')
    .max(20, 'Código inválido')
    // Normaliza o que a pessoa cola: espaços e hífens não fazem parte do código.
    .transform((v) => v.replace(/[\s-]/g, '')),
});

// --------------------------------------------------------------- accounts

export const accountTypes = ['CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'INVESTMENT'] as const;

export const accountSchema = z
  .object({
    spaceId: cuid,
    accountId: optionalCuid,
    name: shortText(60, 'um nome para a conta'),
    type: z.enum(accountTypes).default('CHECKING'),
    openingBalanceCents: optionalAmountCents,
    ownerMembershipId: optionalCuid,
    creditLimitCents: optionalAmountCents,
    statementDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
    dueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
    color: hexColor,
    icon: z.string().trim().max(40).default('wallet'),
  })
  .superRefine((data, ctx) => {
    if (data.type !== 'CREDIT_CARD') return;
    if (data.creditLimitCents !== null && data.creditLimitCents < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['creditLimitCents'],
        message: 'O limite não pode ser negativo',
      });
    }
  });

// ------------------------------------------------------------- categories

export const categorySchema = z.object({
  spaceId: cuid,
  categoryId: optionalCuid,
  name: shortText(40, 'um nome para a categoria'),
  kind: z.enum(['INCOME', 'EXPENSE']),
  color: hexColor,
  icon: z.string().trim().max(40).default('tag'),
});

// ----------------------------------------------------------- transactions

export const transactionTypes = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;
export const splitModes = ['OWNER', 'EQUAL', 'INCOME_RATIO', 'CUSTOM'] as const;

export const transactionSchema = z
  .object({
    spaceId: cuid,
    transactionId: optionalCuid,
    type: z.enum(transactionTypes),
    amountCents: positiveAmountCents,
    date: dateInput,
    description: shortText(120, 'uma descrição'),
    notes: optionalText(500),
    accountId: cuid,
    toAccountId: optionalCuid,
    categoryId: optionalCuid,
    paidByMembershipId: optionalCuid,
    splitMode: z.enum(splitModes).default('OWNER'),
    /**
     * Divisão personalizada: JSON `{ "<membershipId>": "123,45" }`.
     * Vem como string porque FormData não carrega objetos.
     */
    customShares: z
      .string()
      .optional()
      .transform((raw, ctx) => {
        if (!raw) return {} as Record<string, number>;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            throw new Error('formato');
          }
          const result: Record<string, number> = {};
          for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            const cents = typeof value === 'number' ? Math.round(value) : Number(value);
            if (!Number.isFinite(cents)) continue;
            result[key] = Math.max(0, Math.round(cents));
          }
          return result;
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Divisão personalizada inválida' });
          return z.NEVER;
        }
      }),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'TRANSFER') {
      if (!data.toAccountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Escolha a conta de destino',
        });
      } else if (data.toAccountId === data.accountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'A conta de destino precisa ser diferente da origem',
        });
      }
    } else if (data.toAccountId) {
      ctx.addIssue({
        code: 'custom',
        path: ['toAccountId'],
        message: 'Conta de destino só se aplica a transferências',
      });
    }

    if (data.splitMode === 'CUSTOM' && Object.keys(data.customShares).length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['splitMode'],
        message: 'Defina quanto cabe a cada pessoa',
      });
    }
  });

export const deleteTransactionSchema = z.object({
  spaceId: cuid,
  transactionId: cuid,
});

export const transactionFilterSchema = z.object({
  month: monthKey.optional(),
  type: z.enum(transactionTypes).optional(),
  categoryId: optionalCuid,
  accountId: optionalCuid,
  membershipId: optionalCuid,
  search: z.string().trim().max(100).optional(),
});

// ---------------------------------------------------------------- budgets

export const budgetSchema = z.object({
  spaceId: cuid,
  categoryId: cuid,
  month: monthKey,
  // Zero é válido: significa "quero acompanhar esta categoria com meta zero".
  limitCents: positiveAmountCents.or(z.literal(0)),
});

export const deleteBudgetSchema = z.object({
  spaceId: cuid,
  budgetId: cuid,
});

// ------------------------------------------------------------------ goals

export const goalSchema = z.object({
  spaceId: cuid,
  goalId: optionalCuid,
  name: shortText(60, 'um nome para a meta'),
  targetCents: positiveAmountCents,
  targetDate: optionalDateInput,
  color: hexColor,
  icon: z.string().trim().max(40).default('target'),
});

export const goalContributionSchema = z.object({
  spaceId: cuid,
  goalId: cuid,
  amountCents: positiveAmountCents,
  date: dateInput,
  note: optionalText(160),
});

// ------------------------------------------------------------ recurrences

export const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

export const recurrenceSchema = z.object({
  spaceId: cuid,
  recurrenceId: optionalCuid,
  type: z.enum(['INCOME', 'EXPENSE']),
  amountCents: positiveAmountCents,
  description: shortText(120, 'uma descrição'),
  accountId: cuid,
  categoryId: optionalCuid,
  paidByMembershipId: optionalCuid,
  splitMode: z.enum(splitModes).default('OWNER'),
  frequency: z.enum(frequencies).default('MONTHLY'),
  nextRunAt: dateInput,
  endsAt: optionalDateInput,
  active: checkbox,
});

// ------------------------------------------------------------- settlement

export const settlementSchema = z.object({
  spaceId: cuid,
  periodStart: dateInput,
  periodEnd: dateInput,
  note: optionalText(200),
});
