/**
 * Códigos de convite.
 *
 * O código é lido em voz alta ou digitado no celular, então o alfabeto exclui
 * caracteres que se confundem: 0/O, 1/I/L, U (vira V manuscrito). Sobram 26
 * símbolos; 12 posições dão ~56 bits de entropia — muito além do que um
 * atacante conseguiria adivinhar dentro dos 7 dias de validade.
 */

import { createHash, randomInt } from 'node:crypto';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 12;

export function generateInviteCode(): string {
  let code = '';
  // randomInt é criptograficamente seguro (ao contrário de Math.random) e,
  // por não usar módulo sobre um intervalo maior, não introduz viés.
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export function hashInviteCode(code: string): string {
  return createHash('sha256').update(normalizeInviteCode(code)).digest('hex');
}

/** Aceita o código como a pessoa colar: minúsculo, com hífen ou espaço. */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, '');
}

/** "ABCD2345EFGH" → "ABCD-2345-EFGH" (só para exibir). */
export function formatInviteCode(code: string): string {
  const clean = normalizeInviteCode(code);
  return clean.replace(/(.{4})(?=.)/g, '$1-');
}

/** Últimos 4 caracteres, para o dono reconhecer o convite na lista. */
export function inviteCodeHint(code: string): string {
  return normalizeInviteCode(code).slice(-4);
}

export function isValidInviteCodeFormat(code: string): boolean {
  const clean = normalizeInviteCode(code);
  if (clean.length !== LENGTH) return false;
  return [...clean].every((ch) => ALPHABET.includes(ch));
}
