'use server';

/**
 * Ações de autenticação.
 *
 * Cuidados que valem repetir aqui:
 *  - Login nunca diz se foi o e-mail ou a senha que errou (user enumeration).
 *  - Quando o e-mail não existe, ainda gastamos o tempo de um verify
 *    (`fakeVerify`), para que o relógio não denuncie contas existentes.
 *  - Trocar a senha derruba as outras sessões: é o que a pessoa espera quando
 *    troca a senha justamente por desconfiar de acesso indevido.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { audit } from '@/lib/audit';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '@/lib/presets';
import { fakeVerify, hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  registerFailedLogin,
} from '@/lib/auth/rate-limit';
import {
  clearSessionCookie,
  createSession,
  destroyAllSessions,
  destroySession,
  getCurrentSession,
  pruneExpiredSessions,
  setSessionCookie,
} from '@/lib/auth/session';
import { getClientIp, getUserAgent, requireUser } from '@/lib/auth/guard';
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  signupSchema,
} from '@/lib/validation/auth';
import { KnownError, failure, parseForm, runAction, success, type ActionState } from './result';

const GENERIC_LOGIN_ERROR = 'E-mail ou senha incorretos.';

/**
 * O React 19 limpa os campos de um `<form action={...}>` depois que a action
 * roda. Numa falha de login isso apagaria o e-mail junto com a senha, e a
 * pessoa teria que digitar tudo de novo só porque errou um caractere. Então
 * devolvemos o e-mail no estado para a UI repopular o campo.
 *
 * Só o e-mail volta — a senha nunca trafega de volta ao cliente.
 */
function loginFailure(message: string, email: string): ActionState {
  return { ...failure(message), data: { email } };
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const config = env();
    if (config.DISABLE_SIGNUP) {
      throw new KnownError('Novos cadastros estão desativados nesta instância.');
    }

    const parsed = parseForm(signupSchema, formData);
    if (!parsed.ok) return parsed.state;

    const { name, email, password } = parsed.data;

    if (config.ALLOWED_EMAILS.length > 0 && !config.ALLOWED_EMAILS.includes(email)) {
      throw new KnownError('Este e-mail não está autorizado a criar conta aqui.', {
        email: 'E-mail não autorizado',
      });
    }

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      // Aqui revelar é aceitável: quem cadastra sabe se já tem conta, e a
      // alternativa (mensagem genérica) deixaria a pessoa sem saída.
      throw new KnownError('Já existe uma conta com este e-mail.', {
        email: 'E-mail já cadastrado',
      });
    }

    const passwordHash = await hashPassword(password);

    // Cadastro + espaço pessoal + presets numa transação só: ou a pessoa
    // entra num app pronto para uso, ou nada é criado.
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, passwordHash, avatarColor: '#10b981' },
      });

      const space = await tx.space.create({
        data: { name: 'Meu dinheiro', type: 'PERSONAL', currency: 'BRL' },
      });

      await tx.membership.create({
        data: {
          userId: created.id,
          spaceId: space.id,
          role: 'OWNER',
          displayName: name,
          color: created.avatarColor,
        },
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((c, index) => ({
          spaceId: space.id,
          name: c.name,
          kind: c.kind,
          color: c.color,
          icon: c.icon,
          isDefault: true,
          sortOrder: index,
        })),
      });

      await tx.account.createMany({
        data: DEFAULT_ACCOUNTS.map((a, index) => ({
          spaceId: space.id,
          name: a.name,
          type: a.type,
          color: a.color,
          icon: a.icon,
          sortOrder: index,
        })),
      });

      await tx.user.update({ where: { id: created.id }, data: { lastSpaceId: space.id } });

      return created;
    });

    const ip = await getClientIp();
    const { token, expiresAt } = await createSession({
      userId: user.id,
      userAgent: await getUserAgent(),
      ip,
    });
    await setSessionCookie(token, expiresAt);
    await audit({ action: 'auth.signup', userId: user.id, ip });

    redirect('/painel');
  });
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(loginSchema, formData);
    if (!parsed.ok) return parsed.state;

    const { email, password } = parsed.data;
    const ip = await getClientIp();

    const limit = await checkLoginRateLimit(email, ip);
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.retryAfterSeconds / 60);
      return loginFailure(
        `Tentativas demais. Espere ${minutes} minuto${minutes > 1 ? 's' : ''} e tente de novo.`,
        email,
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      // Gasta o mesmo tempo de um verify real antes de responder.
      await fakeVerify(password);
      await registerFailedLogin(email, ip);
      await audit({ action: 'auth.login_failed', ip, meta: { reason: 'email_inexistente' } });
      return loginFailure(GENERIC_LOGIN_ERROR, email);
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      const result = await registerFailedLogin(email, ip);
      await audit({
        action: 'auth.login_failed',
        userId: user.id,
        ip,
        meta: { reason: 'senha_incorreta' },
      });
      if (!result.allowed) {
        return loginFailure(
          'Tentativas demais. Sua conta ficou bloqueada por 15 minutos.',
          email,
        );
      }
      // Avisa das tentativas restantes só quando já está perto do limite.
      const suffix =
        result.remaining <= 3 ? ` Restam ${result.remaining} tentativas.` : '';
      return loginFailure(GENERIC_LOGIN_ERROR + suffix, email);
    }

    await clearLoginAttempts(email, ip);
    void pruneExpiredSessions();

    const { token, expiresAt } = await createSession({
      userId: user.id,
      userAgent: await getUserAgent(),
      ip,
    });
    await setSessionCookie(token, expiresAt);
    await audit({ action: 'auth.login', userId: user.id, ip });

    redirect('/painel');
  });
}

export async function logoutAction(): Promise<void> {
  const session = await getCurrentSession();
  if (session) {
    await destroySession(session.sessionId);
    await audit({ action: 'auth.logout', userId: session.userId, ip: await getClientIp() });
  }
  await clearSessionCookie();
  redirect('/entrar');
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser();
    const session = await getCurrentSession();

    const parsed = parseForm(changePasswordSchema, formData);
    if (!parsed.ok) return parsed.state;

    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!record) throw new KnownError('Conta não encontrada.');

    const valid = await verifyPassword(record.passwordHash, parsed.data.currentPassword);
    if (!valid) {
      return failure('A senha atual está incorreta.', {
        currentPassword: 'Senha incorreta',
      });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Quem troca a senha quer expulsar quem estiver logado em outro lugar.
    await destroyAllSessions(user.id, session?.sessionId);
    await audit({ action: 'auth.password_change', userId: user.id, ip: await getClientIp() });

    revalidatePath('/configuracoes');
    return success('Senha alterada. As outras sessões foram encerradas.');
  });
}

export async function revokeOtherSessionsAction(): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser();
    const session = await getCurrentSession();
    await destroyAllSessions(user.id, session?.sessionId);
    await audit({ action: 'auth.sessions_revoked', userId: user.id, ip: await getClientIp() });
    revalidatePath('/configuracoes');
    return success('Todas as outras sessões foram encerradas.');
  });
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = parseForm(profileSchema, formData);
    if (!parsed.ok) return parsed.state;

    await db.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, theme: parsed.data.theme },
    });

    revalidatePath('/', 'layout');
    return success('Perfil atualizado.');
  });
}
