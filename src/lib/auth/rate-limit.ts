/**
 * Rate limiting de tentativas de login, persistido no banco.
 *
 * Por que no banco e não em memória: o app pode rodar em mais de um processo
 * (PM2, várias instâncias serverless) e um contador em memória seria zerado a
 * cada deploy — exatamente o que um atacante espera.
 *
 * A chave combina e-mail e IP, então nem um atacante trava a conta de alguém
 * de fora (é preciso vir do mesmo IP), nem consegue varrer muitos e-mails do
 * mesmo IP.
 */

import { db } from '@/lib/db';
import { sha256 } from './session';

const MAX_ATTEMPTS = 8;
/** Janela em que as tentativas se acumulam. */
const WINDOW_MS = 15 * 60 * 1000;
/** Bloqueio aplicado ao estourar o limite. */
const BLOCK_MS = 15 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function buildKey(identifier: string, ip: string | null): string {
  return sha256(`${identifier.toLowerCase()}|${ip ?? 'sem-ip'}`);
}

/** Consulta sem consumir tentativa. Chame antes de verificar a senha. */
export async function checkLoginRateLimit(
  identifier: string,
  ip: string | null,
): Promise<RateLimitResult> {
  const key = buildKey(identifier, ip);
  const now = new Date();
  const record = await db.loginAttempt.findUnique({ where: { key } });

  if (!record) return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };

  if (record.blockedUntil && record.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 1000),
    };
  }

  // Janela vencida: o histórico antigo não conta mais.
  if (now.getTime() - record.firstAt.getTime() > WINDOW_MS) {
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  return {
    allowed: record.count < MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - record.count),
    retryAfterSeconds: 0,
  };
}

/** Registra uma tentativa fracassada e bloqueia se passar do limite. */
export async function registerFailedLogin(
  identifier: string,
  ip: string | null,
): Promise<RateLimitResult> {
  const key = buildKey(identifier, ip);
  const now = new Date();
  const existing = await db.loginAttempt.findUnique({ where: { key } });

  const windowExpired = existing && now.getTime() - existing.firstAt.getTime() > WINDOW_MS;
  const count = !existing || windowExpired ? 1 : existing.count + 1;
  const shouldBlock = count >= MAX_ATTEMPTS;

  await db.loginAttempt.upsert({
    where: { key },
    create: {
      key,
      count,
      firstAt: now,
      lastAt: now,
      blockedUntil: shouldBlock ? new Date(now.getTime() + BLOCK_MS) : null,
    },
    update: {
      count,
      lastAt: now,
      ...(windowExpired ? { firstAt: now } : {}),
      blockedUntil: shouldBlock ? new Date(now.getTime() + BLOCK_MS) : null,
    },
  });

  return {
    allowed: !shouldBlock,
    remaining: Math.max(0, MAX_ATTEMPTS - count),
    retryAfterSeconds: shouldBlock ? Math.ceil(BLOCK_MS / 1000) : 0,
  };
}

/** Login bem-sucedido zera o contador. */
export async function clearLoginAttempts(identifier: string, ip: string | null): Promise<void> {
  const key = buildKey(identifier, ip);
  await db.loginAttempt.deleteMany({ where: { key } }).catch(() => {});
}
