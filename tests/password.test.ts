import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { evaluatePasswordStrength, isCommonPassword } from '@/lib/auth/password-policy';

describe('hashPassword', () => {
  it('produz um hash argon2id', async () => {
    const hash = await hashPassword('uma-senha-boa-2026');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('nunca guarda a senha em claro', async () => {
    const senha = 'minha-senha-secreta';
    const hash = await hashPassword(senha);
    expect(hash).not.toContain(senha);
  });

  it('usa salt diferente a cada chamada', async () => {
    const a = await hashPassword('mesma-senha');
    const b = await hashPassword('mesma-senha');
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  it('aceita a senha correta e recusa a errada', async () => {
    const hash = await hashPassword('senha-correta-123');
    expect(await verifyPassword(hash, 'senha-correta-123')).toBe(true);
    expect(await verifyPassword(hash, 'senha-errada-123')).toBe(false);
    expect(await verifyPassword(hash, '')).toBe(false);
  });

  it('trata hash corrompido como senha errada, nunca como sucesso', async () => {
    expect(await verifyPassword('nao-e-um-hash', 'qualquer')).toBe(false);
    expect(await verifyPassword('', 'qualquer')).toBe(false);
  });
});

describe('evaluatePasswordStrength', () => {
  it('pontua senha fraca baixo e senha forte alto', () => {
    expect(evaluatePasswordStrength('123').score).toBeLessThanOrEqual(1);
    expect(evaluatePasswordStrength('Um4-Senha-Bem-Longa-2026').score).toBe(4);
  });

  it('explica o que falta', () => {
    expect(evaluatePasswordStrength('curta').issues.length).toBeGreaterThan(0);
  });
});

describe('isCommonPassword', () => {
  it('detecta as óbvias, ignorando maiúsculas', () => {
    expect(isCommonPassword('123456')).toBe(true);
    expect(isCommonPassword('Senha123')).toBe(true);
    expect(isCommonPassword('uma-senha-bem-particular')).toBe(false);
  });
});
