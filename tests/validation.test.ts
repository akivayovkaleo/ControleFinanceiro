import { describe, expect, it } from 'vitest';
import { transactionSchema, accountSchema, recurrenceSchema } from '@/lib/validation/finance';
import { optionalCuid, checkbox } from '@/lib/validation/shared';

/**
 * Estes testes existem por causa de um bug real: no Zod 4, incluir
 * `z.undefined()` num `union` NÃO torna a chave opcional. Um formulário que
 * não renderiza um campo (o destino de uma transferência numa despesa, por
 * exemplo) simplesmente não o envia — e o schema recusava tudo com
 * "Confira os campos destacados", sem apontar campo nenhum.
 *
 * A regra que os testes fixam: TODO campo opcional precisa aceitar a chave
 * AUSENTE, não só a string vazia.
 */

const base = {
  spaceId: 'space-1',
  type: 'EXPENSE',
  amountCents: '123,45',
  description: 'Mercado',
  date: '2026-08-24',
  accountId: 'conta-1',
};

describe('optionalCuid', () => {
  it('aceita chave ausente, string vazia e null', () => {
    expect(optionalCuid.parse(undefined)).toBeNull();
    expect(optionalCuid.parse('')).toBeNull();
    expect(optionalCuid.parse(null)).toBeNull();
  });

  it('preserva um id de verdade', () => {
    expect(optionalCuid.parse('cmt75y39200297dlflw0rgc0g')).toBe('cmt75y39200297dlflw0rgc0g');
  });
});

describe('checkbox', () => {
  it('trata ausente como false', () => {
    expect(checkbox.parse(undefined)).toBe(false);
  });

  it('trata "on" como true', () => {
    expect(checkbox.parse('on')).toBe(true);
    expect(checkbox.parse('true')).toBe(true);
    expect(checkbox.parse('1')).toBe(true);
  });
});

describe('transactionSchema', () => {
  it('aceita uma despesa sem os campos que o formulário não renderiza', () => {
    // É exatamente o que o navegador envia: sem transactionId, sem
    // toAccountId, sem customShares.
    const parsed = transactionSchema.safeParse({
      ...base,
      categoryId: '',
      splitMode: 'EQUAL',
      paidByMembershipId: 'membro-1',
      notes: '',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amountCents).toBe(12345);
      expect(parsed.data.toAccountId).toBeNull();
      expect(parsed.data.categoryId).toBeNull();
      expect(parsed.data.notes).toBeNull();
    }
  });

  it('aceita uma receita mínima', () => {
    const parsed = transactionSchema.safeParse({
      ...base,
      type: 'INCOME',
      description: 'Salário',
    });
    expect(parsed.success).toBe(true);
  });

  it('exige conta de destino numa transferência', () => {
    const parsed = transactionSchema.safeParse({ ...base, type: 'TRANSFER' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes('toAccountId'))).toBe(true);
    }
  });

  it('recusa transferência para a mesma conta', () => {
    const parsed = transactionSchema.safeParse({
      ...base,
      type: 'TRANSFER',
      toAccountId: base.accountId,
    });
    expect(parsed.success).toBe(false);
  });

  it('recusa conta de destino numa despesa', () => {
    const parsed = transactionSchema.safeParse({ ...base, toAccountId: 'conta-2' });
    expect(parsed.success).toBe(false);
  });

  it('recusa valor zero ou negativo', () => {
    expect(transactionSchema.safeParse({ ...base, amountCents: '0' }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, amountCents: '-10' }).success).toBe(false);
  });

  it('recusa data inválida', () => {
    expect(transactionSchema.safeParse({ ...base, date: '2026-02-31' }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, date: 'ontem' }).success).toBe(false);
  });

  it('lê a divisão personalizada vinda como JSON', () => {
    const parsed = transactionSchema.safeParse({
      ...base,
      splitMode: 'CUSTOM',
      customShares: JSON.stringify({ 'm-1': 8000, 'm-2': 4345 }),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.customShares).toEqual({ 'm-1': 8000, 'm-2': 4345 });
    }
  });

  it('recusa JSON quebrado na divisão personalizada', () => {
    const parsed = transactionSchema.safeParse({
      ...base,
      splitMode: 'CUSTOM',
      customShares: 'isto não é json',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('accountSchema', () => {
  it('aceita uma conta sem os campos de cartão', () => {
    const parsed = accountSchema.safeParse({
      spaceId: 'space-1',
      name: 'Conta corrente',
      type: 'CHECKING',
      color: '#10b981',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.openingBalanceCents).toBeNull();
      expect(parsed.data.ownerMembershipId).toBeNull();
    }
  });

  it('aceita um cartão completo', () => {
    const parsed = accountSchema.safeParse({
      spaceId: 'space-1',
      name: 'Cartão',
      type: 'CREDIT_CARD',
      color: '#8b5cf6',
      creditLimitCents: '5.000,00',
      statementDay: '20',
      dueDay: '28',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.creditLimitCents).toBe(500000);
  });
});

describe('recurrenceSchema', () => {
  it('trata o checkbox "ativa" ausente como false', () => {
    const parsed = recurrenceSchema.safeParse({
      spaceId: 'space-1',
      type: 'EXPENSE',
      amountCents: '2.200,00',
      description: 'Aluguel',
      accountId: 'conta-1',
      nextRunAt: '2026-09-10',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.active).toBe(false);
      expect(parsed.data.frequency).toBe('MONTHLY');
    }
  });
});
