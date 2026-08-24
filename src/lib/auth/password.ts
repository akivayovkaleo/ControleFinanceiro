/**
 * Hash de senha com Argon2id.
 *
 * Argon2id é a recomendação atual do OWASP: resistente a GPU e a ataques de
 * canal lateral. Os parâmetros abaixo seguem o perfil "m=19 MiB, t=2, p=1"
 * do OWASP Password Storage Cheat Sheet.
 *
 * NUNCA guarde, logue ou devolva a senha em claro.
 */

import { hash, verify } from '@node-rs/argon2';

// `Algorithm` de @node-rs/argon2 é um `const enum`, inacessível com
// `isolatedModules` ligado. 2 = Argon2id (0 = Argon2d, 1 = Argon2i).
const ARGON2ID = 2;

const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain, OPTIONS);
  } catch {
    // Hash corrompido ou em formato desconhecido: trate como senha errada,
    // nunca como sucesso.
    return false;
  }
}

/**
 * Verificação "fantasma": gasta o mesmo tempo de um verify real quando o
 * e-mail não existe. Sem isso, o tempo de resposta revelaria quais e-mails
 * têm conta (user enumeration).
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZS1zYWx0LXZhbHVl$8Bl5r0F5H8zJ5V1kQ1cZ1V5x1qQ0Z1cZ1V5x1qQ0Z1c';

export async function fakeVerify(plain: string): Promise<void> {
  await verifyPassword(DUMMY_HASH, plain);
}

/**
 * A política de senha (medidor de força, lista de senhas comuns) vive em
 * `password-policy.ts` porque o cliente também precisa dela — e este módulo
 * importa o binário nativo do Argon2, que não pode ir para o navegador.
 */
export {
  evaluatePasswordStrength,
  isCommonPassword,
  type PasswordStrength,
} from './password-policy';
