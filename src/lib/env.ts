/**
 * Configuração de ambiente, validada na inicialização.
 *
 * Falhar cedo e alto é melhor do que descobrir em produção que AUTH_SECRET
 * estava vazio e todas as sessões eram forjáveis.
 */

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Caminho do SQLite (ou URL do Postgres, se você migrar). */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),

  /**
   * Chave de assinatura dos cookies de sessão. Gere com:
   *   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   * Trocar esta chave desloga todo mundo — é o botão de emergência.
   */
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET precisa ter pelo menos 32 caracteres. Rode `npm run setup`.'),

  /** Duração da sessão em dias. */
  SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),

  /**
   * Quando "true", bloqueia novos cadastros. Ligue depois que você e sua
   * parceira já tiverem conta — a instância deixa de aceitar estranhos.
   */
  DISABLE_SIGNUP: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),

  /**
   * Lista de e-mails autorizados a se cadastrar, separados por vírgula.
   * Vazio = qualquer e-mail (respeitando DISABLE_SIGNUP).
   */
  ALLOWED_EMAILS: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),

  /** URL pública, usada para montar links de convite. */
  APP_URL: z.string().url().optional(),
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Configuração de ambiente inválida:\n${issues}\n\n` +
        'Copie .env.example para .env e rode `npm run setup` para gerar os segredos.',
    );
  }

  return parsed.data;
}

/**
 * Em build-time o Next avalia módulos sem o .env completo. Como este módulo
 * só é importado por código de servidor em runtime, validamos preguiçosamente.
 */
let cached: z.infer<typeof schema> | null = null;

export function env(): z.infer<typeof schema> {
  cached ??= loadEnv();
  return cached;
}

export const isProduction = () => process.env.NODE_ENV === 'production';
