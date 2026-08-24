/**
 * Sessões.
 *
 * Modelo em duas camadas, de propósito:
 *
 *   1. O cookie carrega um JWT assinado (HS256) com o id da sessão. Isso deixa
 *      o middleware descartar cookies forjados ou expirados na borda, sem
 *      tocar no banco.
 *   2. A sessão também vive na tabela `Session`. É ela que manda: apagar a
 *      linha desloga na hora. É assim que "sair de todos os dispositivos" e a
 *      invalidação na troca de senha funcionam de verdade — um JWT puro
 *      continuaria válido até expirar.
 *
 * O token em claro nunca é persistido: o banco guarda só o SHA-256.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { SESSION_COOKIE } from './constants';
import { env } from '@/lib/env';

// Reexportado para quem já importa daqui; a definição vive em './constants',
// que o middleware (runtime Edge) também consegue importar.
export { SESSION_COOKIE };

const ISSUER = 'controle-financeiro';

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Comparação em tempo constante, para não vazar informação pelo relógio. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

interface SessionClaims {
  sid: string;
  uid: string;
}

async function signSessionToken(claims: SessionClaims, expiresAt: Date): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey());
}

/**
 * Valida assinatura e expiração do cookie. NÃO consulta o banco — serve ao
 * middleware, que roda no Edge. A verificação que decide acesso é
 * `getCurrentSession`.
 */
export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER });
    if (typeof payload.sid !== 'string' || typeof payload.uid !== 'string') return null;
    return { sid: payload.sid, uid: payload.uid };
  } catch {
    return null;
  }
}

/** Cria a sessão no banco e devolve o cookie a ser gravado. */
export async function createSession(params: {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const { userId, userAgent, ip } = params;
  const days = env().SESSION_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const rawToken = randomBytes(32).toString('base64url');

  const session = await db.session.create({
    data: {
      userId,
      tokenHash: sha256(rawToken),
      userAgent: userAgent?.slice(0, 255) ?? null,
      ipHash: ip ? sha256(ip) : null,
      expiresAt,
    },
  });

  const jwt = await signSessionToken({ sid: session.id, uid: userId }, expiresAt);
  // O cookie carrega o JWT e o token opaco: o JWT prova a assinatura, o token
  // prova a posse da sessão (o banco só conhece o hash dele).
  return { token: `${jwt}.${rawToken}`, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true, // fora do alcance de JavaScript → XSS não rouba a sessão
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // bloqueia CSRF cross-site sem quebrar links de entrada
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export interface CurrentSession {
  sessionId: string;
  userId: string;
}

/**
 * Lê o cookie e valida a sessão contra o banco.
 * Fonte de verdade da autenticação — todo `require*` passa por aqui.
 */
export async function getCurrentSession(): Promise<CurrentSession | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  const separator = cookie.lastIndexOf('.');
  if (separator === -1) return null;

  const jwt = cookie.slice(0, separator);
  const rawToken = cookie.slice(separator + 1);
  if (!jwt || !rawToken) return null;

  const claims = await verifySessionToken(jwt);
  if (!claims) return null;

  const session = await db.session.findUnique({
    where: { id: claims.sid },
    select: { id: true, userId: true, tokenHash: true, expiresAt: true },
  });

  if (!session) return null;
  if (session.userId !== claims.uid) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!safeEqual(session.tokenHash, sha256(rawToken))) return null;

  return { sessionId: session.id, userId: session.userId };
}

/** Marca atividade. Melhor esforço: nunca deve derrubar uma requisição. */
export async function touchSession(sessionId: string): Promise<void> {
  await db.session
    .update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } })
    .catch(() => {});
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.session.delete({ where: { id: sessionId } }).catch(() => {});
}

/** Usado em "sair de todos os dispositivos" e depois de trocar a senha. */
export async function destroyAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await db.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { NOT: { id: exceptSessionId } } : {}) },
  });
}

/** Limpeza de sessões vencidas. Chamada de forma oportunista no login. */
export async function pruneExpiredSessions(): Promise<void> {
  await db.session.deleteMany({ where: { expiresAt: { lte: new Date() } } }).catch(() => {});
}
