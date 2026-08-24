import { describe, expect, it } from 'vitest';
import {
  formatInviteCode,
  generateInviteCode,
  hashInviteCode,
  isValidInviteCodeFormat,
  normalizeInviteCode,
} from '@/lib/invite-code';

describe('generateInviteCode', () => {
  it('gera 12 caracteres válidos', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(12);
      expect(isValidInviteCodeFormat(code)).toBe(true);
    }
  });

  it('não usa caracteres ambíguos', () => {
    const codes = Array.from({ length: 200 }, generateInviteCode).join('');
    for (const ambiguous of ['0', 'O', '1', 'I', 'L', 'U']) {
      expect(codes).not.toContain(ambiguous);
    }
  });

  it('não repete na prática', () => {
    const codes = new Set(Array.from({ length: 500 }, generateInviteCode));
    expect(codes.size).toBe(500);
  });
});

describe('normalizeInviteCode', () => {
  it('aceita o código como a pessoa cola', () => {
    expect(normalizeInviteCode('abcd-2345-efgh')).toBe('ABCD2345EFGH');
    expect(normalizeInviteCode('  ABCD 2345 EFGH ')).toBe('ABCD2345EFGH');
  });
});

describe('hashInviteCode', () => {
  it('é estável para variações de digitação do mesmo código', () => {
    expect(hashInviteCode('abcd-2345-efgh')).toBe(hashInviteCode('ABCD2345EFGH'));
  });

  it('não guarda o código em claro', () => {
    const hash = hashInviteCode('ABCD2345EFGH');
    expect(hash).not.toContain('ABCD');
    expect(hash).toHaveLength(64);
  });
});

describe('formatInviteCode', () => {
  it('agrupa de quatro em quatro', () => {
    expect(formatInviteCode('ABCD2345EFGH')).toBe('ABCD-2345-EFGH');
  });
});

describe('isValidInviteCodeFormat', () => {
  it('recusa tamanho errado ou caractere fora do alfabeto', () => {
    expect(isValidInviteCodeFormat('ABC')).toBe(false);
    expect(isValidInviteCodeFormat('ABCD2345EFG0')).toBe(false);
    expect(isValidInviteCodeFormat('ABCD2345EFGH')).toBe(true);
  });
});
