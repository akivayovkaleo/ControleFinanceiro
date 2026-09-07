/**
 * Cartão de crédito: ciclos de fatura, faturas e limite.
 *
 * Camada pura — não toca no banco, não sabe o que é um `spaceId`. Recebe
 * lançamentos já filtrados e devolve faturas.
 *
 * A decisão mais importante deste arquivo é a **borda do dia de fechamento**
 * (ver `CardConfig.statementInclusive`). Errá-la desloca lançamentos inteiros de
 * uma fatura para outra sem dar erro nenhum — o total simplesmente fica errado.
 *
 * Datas aqui são sempre meia-noite UTC, como no resto do app (src/lib/date.ts).
 */

import { daysInMonth, utcDate } from './date';
import type { Cents } from './money';

// ---------------------------------------------------------------------------
// Configuração e ciclos
// ---------------------------------------------------------------------------

export interface CardConfig {
  /** Dia do fechamento. 31 cai para o último dia dos meses mais curtos. */
  closingDay: number;
  /** Dia do vencimento. Se for <= ao fechamento, vence no mês seguinte. */
  dueDay: number;
  limitCents: Cents | null;
  /**
   * Uma compra feita **no próprio dia do fechamento** entra nessa fatura?
   *
   * Não há resposta universal — os emissores divergem. Itaú e Bradesco costumam
   * incluir (a fatura fecha no fim do dia); o Nubank costuma empurrar para a
   * seguinte (a fatura já foi gerada). Como a escolha muda o valor de duas
   * faturas de uma vez e não dá erro nenhum, ela fica explícita e por conta do
   * usuário, com um padrão declarado:
   *
   * - `true`  -> ciclo (fechamento anterior, fechamento] — a compra do dia entra.
   * - `false` -> ciclo [fechamento anterior, fechamento) — vai para a próxima.
   */
  statementInclusive: boolean;
}

/** O padrão brasileiro mais comum: a fatura fecha no fim do dia. */
export const DEFAULT_STATEMENT_INCLUSIVE = true;

export interface Cycle {
  /** Primeiro dia que pertence a este ciclo. */
  start: Date;
  /** Último dia que pertence a este ciclo. */
  end: Date;
  /** Data nominal do fechamento. Coincide com `end` quando é inclusivo. */
  closeDate: Date;
  dueDate: Date;
}

/**
 * Desloca uma data em N meses mantendo um dia preferido, encurtado nos meses
 * que não o têm.
 *
 * Não dá para usar `addMonthsUtc` aqui: ela preserva o dia da data recebida, e
 * um fechamento dia 31 que já foi encurtado para 28 em fevereiro voltaria como
 * dia 28 em março, em vez de 31. O dia preferido é sempre reaplicado a partir
 * da configuração do cartão.
 */
function shiftMonths(date: Date, months: number, preferredDay: number): Date {
  const absoluteMonth = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(absoluteMonth / 12);
  const month = (absoluteMonth % 12) + 1;
  return utcDate(year, month, Math.min(preferredDay, daysInMonth(year, month)));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Soma dias. Seguro porque toda data é meia-noite UTC — UTC não tem horário de verão. */
function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Data de fechamento num dado mês, encurtada nos meses que não têm esse dia. */
export function closingDateIn(year: number, month1to12: number, closingDay: number): Date {
  return utcDate(year, month1to12, Math.min(closingDay, daysInMonth(year, month1to12)));
}

/**
 * Vencimento de uma fatura que fechou em `closeDate`.
 *
 * Se o dia do vencimento for maior que o do fechamento, vence no mesmo mês;
 * senão, no mês seguinte. É a regra que impede um vencimento anterior ao
 * próprio fechamento.
 */
export function dueDateFor(closeDate: Date, config: CardConfig): Date {
  return shiftMonths(closeDate, config.dueDay > config.closingDay ? 0 : 1, config.dueDay);
}

/** O ciclo cuja fatura fecha em `closeDate`. */
export function cycleClosingOn(closeDate: Date, config: CardConfig): Cycle {
  const previousClose = shiftMonths(closeDate, -1, config.closingDay);
  const dueDate = dueDateFor(closeDate, config);

  return config.statementInclusive
    ? { start: addDaysUtc(previousClose, 1), end: closeDate, closeDate, dueDate }
    : { start: previousClose, end: addDaysUtc(closeDate, -1), closeDate, dueDate };
}

/** O ciclo que contém `date`. */
export function cycleFor(date: Date, config: CardConfig): Cycle {
  const candidate = closingDateIn(date.getUTCFullYear(), date.getUTCMonth() + 1, config.closingDay);

  // Inclusivo: pertence a este ciclo enquanto `date <= fechamento`.
  // Exclusivo: só enquanto `date < fechamento`.
  const belongsHere = config.statementInclusive
    ? date.getTime() <= candidate.getTime()
    : date.getTime() < candidate.getTime();

  return cycleClosingOn(
    belongsHere ? candidate : shiftMonths(candidate, 1, config.closingDay),
    config,
  );
}

export function nextCycle(cycle: Cycle, config: CardConfig): Cycle {
  return cycleClosingOn(shiftMonths(cycle.closeDate, 1, config.closingDay), config);
}

export function previousCycle(cycle: Cycle, config: CardConfig): Cycle {
  return cycleClosingOn(shiftMonths(cycle.closeDate, -1, config.closingDay), config);
}

export function isInCycle(date: Date, cycle: Cycle): boolean {
  return date.getTime() >= cycle.start.getTime() && date.getTime() <= cycle.end.getTime();
}

// ---------------------------------------------------------------------------
// Parcelas no cartão
// ---------------------------------------------------------------------------

/**
 * Datas das N parcelas de uma compra no cartão.
 *
 * A parcela 1 fica na fatura da própria compra; a parcela k, na k-ésima fatura
 * seguinte. **Não basta somar meses à data da compra**: com fechamento no dia 30
 * e compra em 31 de janeiro, somar um mês daria 28 de fevereiro, que pode cair
 * no ciclo errado. Aqui se calcula o ciclo alvo e se coloca a parcela dentro
 * dele, sempre.
 *
 * O dia escolhido dentro do ciclo é o da compra quando ele existe no intervalo;
 * senão, o fim do ciclo — o dia mais tardio que ainda lhe pertence.
 */
export function installmentDatesForCard(
  purchaseDate: Date,
  count: number,
  config: CardConfig,
): Date[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('O parcelamento exige pelo menos 1 parcela.');
  }

  const purchaseDay = purchaseDate.getUTCDate();
  const dates: Date[] = [purchaseDate];

  let cycle = cycleFor(purchaseDate, config);
  for (let k = 1; k < count; k++) {
    cycle = nextCycle(cycle, config);
    dates.push(dateInsideCycle(cycle, purchaseDay));
  }

  return dates;
}

/** Coloca o dia pretendido dentro do ciclo, sem nunca sair dele. */
function dateInsideCycle(cycle: Cycle, preferredDay: number): Date {
  // Tenta o dia pretendido no mês em que o ciclo termina.
  const candidate = closingDateIn(
    cycle.end.getUTCFullYear(),
    cycle.end.getUTCMonth() + 1,
    preferredDay,
  );
  if (isInCycle(candidate, cycle)) return candidate;

  // Um ciclo atravessa dois meses; tenta também o mês em que ele começa.
  const alternative = closingDateIn(
    cycle.start.getUTCFullYear(),
    cycle.start.getUTCMonth() + 1,
    preferredDay,
  );
  if (isInCycle(alternative, cycle)) return alternative;

  // Nenhum dos dois serve: o fim do ciclo pertence a ele sempre.
  return cycle.end;
}

// ---------------------------------------------------------------------------
// Faturas
// ---------------------------------------------------------------------------

export type StatementStatus = 'open' | 'closed' | 'paid';

export interface StatementEntry {
  id: string;
  date: Date;
  description: string;
  amountCents: Cents;
  /** Compras somam à fatura; estornos abatem. */
  direction: 'charge' | 'credit';
  categoryName: string | null;
  categoryColor: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
}

export interface Statement {
  cycle: Cycle;
  status: StatementStatus;
  /** Compras menos estornos do ciclo. Nunca inclui pagamentos de fatura. */
  totalCents: Cents;
  paidCents: Cents;
  /** O que falta liquidar. Zero quando `status` é `paid`. */
  outstandingCents: Cents;
  entries: StatementEntry[];
}

export function statementStatus(
  cycle: Cycle,
  totalCents: Cents,
  paidCents: Cents,
  today: Date,
): StatementStatus {
  // Ainda pode receber lançamentos: aberta, mesmo que já haja pagamento adiantado.
  if (today.getTime() <= cycle.end.getTime()) return 'open';
  // Uma fatura de zero está liquidada por definição — não faz sentido "fechada
  // e a pagar" quando não há nada a pagar.
  if (totalCents <= 0) return 'paid';
  return paidCents >= totalCents ? 'paid' : 'closed';
}

/** Chave estável de um ciclo: o ISO do dia de fechamento. */
export function closeKey(closeDate: Date): string {
  return closeDate.toISOString().slice(0, 10);
}

export interface BuildStatementsInput {
  entries: StatementEntry[];
  config: CardConfig;
  /** Total pago por fatura, indexado por `closeKey`. */
  paymentsByClose: ReadonlyMap<string, Cents>;
  today: Date;
  /** Quantos ciclos futuros incluir além do atual. */
  futureCycles?: number;
  /** Quantos ciclos passados incluir. */
  pastCycles?: number;
}

/**
 * Agrupa os lançamentos do cartão em faturas.
 *
 * A janela é construída em torno de hoje, e não em torno dos lançamentos: uma
 * fatura futura sem compra nenhuma continua sendo informação útil (é onde as
 * parcelas vão cair), e uma fatura passada vazia também — mostra que não houve
 * gasto, em vez de sumir da lista.
 */
export function buildStatements(input: BuildStatementsInput): Statement[] {
  const { entries, config, paymentsByClose, today } = input;
  const future = input.futureCycles ?? 2;
  const past = input.pastCycles ?? 6;

  const current = cycleFor(today, config);

  // Junta a janela em torno de hoje com os ciclos onde há lançamentos, para não
  // esconder uma parcela que caia além do horizonte.
  const closes = new Map<string, Date>();
  const remember = (date: Date) => closes.set(closeKey(date), date);

  let cursor = current;
  remember(cursor.closeDate);
  for (let i = 0; i < past; i++) {
    cursor = previousCycle(cursor, config);
    remember(cursor.closeDate);
  }
  cursor = current;
  for (let i = 0; i < future; i++) {
    cursor = nextCycle(cursor, config);
    remember(cursor.closeDate);
  }
  for (const entry of entries) {
    remember(cycleFor(entry.date, config).closeDate);
  }

  const statements = Array.from(closes.values(), (closeDate) => {
    const cycle = cycleClosingOn(closeDate, config);
    const own = entries.filter((entry) => isInCycle(entry.date, cycle));

    const totalCents = own.reduce(
      (acc, entry) => acc + (entry.direction === 'charge' ? entry.amountCents : -entry.amountCents),
      0,
    );
    const paidCents = paymentsByClose.get(closeKey(closeDate)) ?? 0;

    return {
      cycle,
      status: statementStatus(cycle, totalCents, paidCents, today),
      totalCents,
      paidCents,
      outstandingCents: Math.max(0, totalCents - paidCents),
      entries: own
        .slice()
        .sort(
          (a, b) =>
            a.date.getTime() - b.date.getTime() ||
            a.description.localeCompare(b.description, 'pt-BR'),
        ),
    } satisfies Statement;
  });

  return statements.sort((a, b) => a.cycle.closeDate.getTime() - b.cycle.closeDate.getTime());
}

// ---------------------------------------------------------------------------
// Limite
// ---------------------------------------------------------------------------

export interface LimitUsage {
  limitCents: Cents | null;
  /** Tudo que está em aberto: compras ainda não faturadas + faturas a pagar. */
  usedCents: Cents;
  /** `null` quando a conta não tem limite definido. */
  availableCents: Cents | null;
  /** Fração usada, 0–1. `null` sem limite. */
  ratio: number | null;
  overLimit: boolean;
}

/**
 * Limite disponível = limite − dívida em aberto.
 *
 * A dívida sai do próprio saldo da conta: num cartão, as compras são despesas
 * (baixam o saldo) e o pagamento da fatura é uma transferência que entra (sobe).
 * O saldo negativo **é** a dívida, e cobre por construção tanto as compras ainda
 * não faturadas quanto as faturas fechadas e não pagas — sem contar as duas
 * coisas duas vezes.
 */
export function limitUsage(limitCents: Cents | null, balanceCents: Cents): LimitUsage {
  // Saldo positivo num cartão é crédito a favor; não conta como limite usado.
  const usedCents = Math.max(0, -balanceCents);

  if (limitCents === null || limitCents <= 0) {
    return { limitCents, usedCents, availableCents: null, ratio: null, overLimit: false };
  }

  return {
    limitCents,
    usedCents,
    availableCents: limitCents - usedCents,
    ratio: Math.min(1, usedCents / limitCents),
    overLimit: usedCents > limitCents,
  };
}
