/**
 * Trilha de auditoria.
 *
 * Num space compartilhado duas pessoas mexem nos mesmos números. Quando
 * alguém pergunta "quem apagou o lançamento do aluguel?", a resposta precisa
 * existir. Registrar é sempre melhor esforço: uma falha aqui nunca deve
 * derrubar a operação que o usuário pediu.
 */

import { db } from '@/lib/db';
import { sha256 } from '@/lib/auth/session';

export type AuditAction =
  | 'auth.signup'
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.password_change'
  | 'auth.sessions_revoked'
  | 'space.create'
  | 'space.update'
  | 'space.delete'
  | 'member.join'
  | 'member.update'
  | 'member.remove'
  | 'member.leave'
  | 'invite.create'
  | 'invite.revoke'
  | 'invite.accept'
  | 'account.create'
  | 'account.update'
  | 'account.archive'
  | 'account.delete'
  | 'category.create'
  | 'category.update'
  | 'category.delete'
  | 'transaction.create'
  | 'transaction.update'
  | 'transaction.delete'
  | 'budget.set'
  | 'budget.delete'
  | 'goal.create'
  | 'goal.update'
  | 'goal.delete'
  | 'goal.contribute'
  | 'recurrence.create'
  | 'recurrence.update'
  | 'recurrence.delete'
  | 'recurrence.materialize'
  | 'settlement.create'
  | 'settlement.delete';

export async function audit(params: {
  action: AuditAction;
  userId?: string | null;
  spaceId?: string | null;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: params.action,
        userId: params.userId ?? null,
        spaceId: params.spaceId ?? null,
        entity: params.entity ?? null,
        entityId: params.entityId ?? null,
        meta: params.meta ? JSON.stringify(params.meta).slice(0, 2000) : null,
        ipHash: params.ip ? sha256(params.ip) : null,
      },
    });
  } catch {
    // Auditoria nunca quebra o fluxo do usuário.
  }
}

/** Descrições legíveis para a tela de atividade. */
export const AUDIT_LABELS: Partial<Record<AuditAction, string>> = {
  'auth.login': 'entrou na conta',
  'auth.logout': 'saiu da conta',
  'auth.password_change': 'trocou a senha',
  'auth.sessions_revoked': 'encerrou as outras sessões',
  'space.create': 'criou o espaço',
  'space.update': 'alterou o espaço',
  'member.join': 'entrou no espaço',
  'member.update': 'atualizou um membro',
  'member.remove': 'removeu um membro',
  'member.leave': 'saiu do espaço',
  'invite.create': 'gerou um convite',
  'invite.revoke': 'cancelou um convite',
  'invite.accept': 'aceitou um convite',
  'account.create': 'criou uma conta',
  'account.update': 'editou uma conta',
  'account.archive': 'arquivou uma conta',
  'account.delete': 'excluiu uma conta',
  'category.create': 'criou uma categoria',
  'category.update': 'editou uma categoria',
  'category.delete': 'excluiu uma categoria',
  'transaction.create': 'lançou',
  'transaction.update': 'editou o lançamento',
  'transaction.delete': 'excluiu o lançamento',
  'budget.set': 'definiu um orçamento',
  'budget.delete': 'removeu um orçamento',
  'goal.create': 'criou uma meta',
  'goal.update': 'editou uma meta',
  'goal.delete': 'excluiu uma meta',
  'goal.contribute': 'guardou dinheiro numa meta',
  'recurrence.create': 'criou uma recorrência',
  'recurrence.update': 'editou uma recorrência',
  'recurrence.delete': 'excluiu uma recorrência',
  'recurrence.materialize': 'gerou lançamentos recorrentes',
  'settlement.create': 'registrou um acerto de contas',
  'settlement.delete': 'desfez um acerto de contas',
};
