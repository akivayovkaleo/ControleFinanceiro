/**
 * Materialização de recorrências.
 *
 * Não há cron: um app self-hosted que depende de agendador externo quebra
 * silenciosamente quando o servidor reinicia. Em vez disso, as ocorrências
 * pendentes são geradas quando alguém abre o app — o resultado é o mesmo e
 * não há infraestrutura para manter.
 */

import { nextOccurrence, todayUtc, type Frequency } from './date';

export interface PendingOccurrence {
  date: Date;
}

/** Limite de ocorrências geradas por vez, contra recorrência antiga esquecida. */
const MAX_PER_RUN = 60;

/**
 * Datas pendentes de uma recorrência, de `nextRunAt` até hoje (inclusive).
 * Devolve também o novo `nextRunAt` a gravar.
 */
export function pendingOccurrences(params: {
  nextRunAt: Date;
  frequency: Frequency;
  endsAt?: Date | null;
  until?: Date;
}): { dates: Date[]; newNextRunAt: Date } {
  const until = params.until ?? todayUtc();
  const dates: Date[] = [];

  let cursor = params.nextRunAt;
  let guard = 0;

  while (cursor <= until && guard < MAX_PER_RUN) {
    if (params.endsAt && cursor > params.endsAt) break;
    dates.push(cursor);
    cursor = nextOccurrence(cursor, params.frequency);
    guard++;
  }

  return { dates, newNextRunAt: cursor };
}
