/**
 * Política de senha — parte que roda TAMBÉM no cliente.
 *
 * Separado de `password.ts` de propósito: aquele importa `@node-rs/argon2`,
 * um módulo nativo que não pode entrar no bundle do navegador. O medidor de
 * força na tela de cadastro precisa apenas destas funções puras.
 *
 * Lembrete: isto é orientação visual. Quem aceita ou recusa uma senha é o
 * schema Zod no servidor.
 */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  issues: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const issues: string[] = [];
  let score = 0;

  if (password.length >= 10) score++;
  else issues.push('use pelo menos 10 caracteres');

  if (password.length >= 16) score++;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else issues.push('misture maiúsculas e minúsculas');

  if (/\d/.test(password) || /[^\w\s]/.test(password)) score++;
  else issues.push('inclua um número ou símbolo');

  const labels = ['muito fraca', 'fraca', 'razoável', 'boa', 'forte'];
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;

  return { score: clamped, label: labels[clamped]!, issues };
}

/**
 * Senhas notoriamente vazadas/óbvias. Lista curta de propósito: o objetivo é
 * barrar o pior caso, não substituir um serviço como o Have I Been Pwned.
 */
const COMMON_PASSWORDS = new Set([
  '123456', '12345678', '123456789', '1234567890', 'password', 'senha123',
  'qwerty', 'abc123', '111111', '123123', 'admin123', 'iloveyou',
  'senha', 'brasil', 'flamengo', 'corinthians', '12345', 'password123',
  'minhasenha', 'mudar123', 'trocar123', 'teste123',
]);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase().trim());
}
