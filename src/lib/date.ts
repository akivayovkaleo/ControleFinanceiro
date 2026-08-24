/**
 * Datas no Controle Financeiro.
 *
 * PROBLEMA: um lançamento de "31/01" digitado no Brasil (UTC-3) e salvo como
 * `new Date("2026-01-31")` vira 31/01 00:00 UTC = 30/01 21:00 em São Paulo.
 * O extrato mostraria o dia errado.
 *
 * SOLUÇÃO: datas de competência não têm hora. Guardamos sempre a meia-noite
 * UTC do dia escolhido e SEMPRE lemos/escrevemos via as funções deste arquivo,
 * que trabalham com os componentes UTC. Nunca use `getMonth()`/`getDate()`
 * (locais) numa data de competência — use `getUTCMonth()`/`getUTCDate()`.
 */

import {
  addDays,
  addMonths as addMonthsFns,
  addWeeks,
  addYears,
  differenceInCalendarDays,
} from 'date-fns';

/** Competência no formato "YYYY-MM". É como orçamentos são chaveados. */
export type MonthKey = string;

/** Constrói a meia-noite UTC de um dia calendário. */
export function utcDate(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day, 0, 0, 0, 0));
}

/** Converte "2026-01-31" (input type=date) na meia-noite UTC correspondente. */
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = utcDate(Number(y), Number(m), Number(d));
  // Rejeita datas impossíveis ("2026-02-31" seria normalizado para 03/03).
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
  return date;
}

/** Serializa para o valor de um `<input type="date">`. */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Hoje, normalizado para meia-noite UTC do dia local do usuário. */
export function todayUtc(): Date {
  const now = new Date();
  return utcDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** "2026-01" a partir de uma data. */
export function toMonthKey(date: Date): MonthKey {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Valida e desmonta uma MonthKey. */
export function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 1970 || year > 9999) return null;
  return { year, month };
}

export function currentMonthKey(): MonthKey {
  return toMonthKey(todayUtc());
}

/** Desloca uma MonthKey em N meses: shiftMonthKey("2026-01", -1) → "2025-12". */
export function shiftMonthKey(key: MonthKey, delta: number): MonthKey {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  const date = utcDate(parsed.year, parsed.month, 1);
  return toMonthKey(addMonthsFns(date, delta));
}

/**
 * Intervalo [início, fim) de uma competência, respeitando `monthStartDay`.
 *
 * Com `monthStartDay = 1` (padrão) é o mês civil. Com `monthStartDay = 5`,
 * a competência "2026-03" vai de 05/03 (inclusive) a 05/04 (exclusive) —
 * útil para quem organiza as contas em torno da data do salário.
 */
export function monthRange(key: MonthKey, monthStartDay = 1): { start: Date; end: Date } {
  const parsed = parseMonthKey(key) ?? parseMonthKey(currentMonthKey())!;
  const day = clampStartDay(monthStartDay);
  const start = utcDate(parsed.year, parsed.month, Math.min(day, daysInMonth(parsed.year, parsed.month)));
  const end = addMonthsUtc(start, 1);
  return { start, end };
}

/** Competência a que uma data pertence, dado o `monthStartDay` do space. */
export function monthKeyFor(date: Date, monthStartDay = 1): MonthKey {
  const day = clampStartDay(monthStartDay);
  if (day === 1 || date.getUTCDate() >= day) return toMonthKey(date);
  return shiftMonthKey(toMonthKey(date), -1);
}

function clampStartDay(day: number): number {
  if (!Number.isInteger(day) || day < 1) return 1;
  return Math.min(day, 28);
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** addMonths preservando a meia-noite UTC (date-fns opera em hora local). */
export function addMonthsUtc(date: Date, months: number): Date {
  const result = addMonthsFns(date, months);
  return utcDate(result.getFullYear(), result.getMonth() + 1, result.getDate());
}

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** "2026-03" → "março de 2026". */
export function formatMonthKey(key: MonthKey): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  return `${MONTH_NAMES[parsed.month - 1]} de ${parsed.year}`;
}

/** "2026-03" → "mar/26" — para abas e gráficos. */
export function formatMonthKeyShort(key: MonthKey): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  return `${MONTH_NAMES[parsed.month - 1]!.slice(0, 3)}/${String(parsed.year).slice(2)}`;
}

/** "31 de janeiro" ou "31 de janeiro de 2025" se for de outro ano. */
export function formatDate(date: Date, opts: { withYear?: boolean } = {}): string {
  const withYear = opts.withYear ?? date.getUTCFullYear() !== todayUtc().getUTCFullYear();
  const base = `${date.getUTCDate()} de ${MONTH_NAMES[date.getUTCMonth()]}`;
  return withYear ? `${base} de ${date.getUTCFullYear()}` : base;
}

/** "31/01/2026" */
export function formatDateShort(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

/** "hoje", "ontem", "em 3 dias", "há 5 dias". */
export function formatRelativeDay(date: Date): string {
  const diff = differenceInCalendarDays(date, todayUtc());
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  if (diff === -1) return 'ontem';
  if (diff > 0) return `em ${diff} dias`;
  return `há ${Math.abs(diff)} dias`;
}

export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

/** Próxima ocorrência de uma recorrência, mantendo meia-noite UTC. */
export function nextOccurrence(date: Date, frequency: Frequency): Date {
  const local = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  let next: Date;
  switch (frequency) {
    case 'WEEKLY':
      next = addWeeks(local, 1);
      break;
    case 'BIWEEKLY':
      next = addDays(local, 14);
      break;
    case 'QUARTERLY':
      next = addMonthsFns(local, 3);
      break;
    case 'YEARLY':
      next = addYears(local, 1);
      break;
    case 'MONTHLY':
    default:
      next = addMonthsFns(local, 1);
      break;
  }
  return utcDate(next.getFullYear(), next.getMonth() + 1, next.getDate());
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};
