/**
 * Parcelamento.
 *
 * A regra que este arquivo existe para garantir: **a soma das parcelas é
 * exatamente o total**. Dividir R$ 100,00 em 3 dá 33,33 três vezes e sobra 1
 * centavo; arredondar cada parcela por si perde esse centavo, e um centavo
 * perdido por compra é um saldo que nunca fecha.
 *
 * A distribuição do resto não é reimplementada aqui: é a mesma `splitEvenly` de
 * src/lib/money.ts que já divide os `TransactionShare` sem perda, com o resto
 * indo para as primeiras posições. É também a convenção que os bancos usam na
 * fatura, então é a que menos surpreende quem confere.
 */

import { addMonthsUtc, daysInMonth, utcDate } from './date';
import { splitEvenly, type Cents } from './money';

/**
 * Teto de parcelas. 360 = 30 anos; acima disso é quase certo ser erro de
 * digitação, e cada parcela vira uma linha no extrato.
 */
export const MAX_INSTALLMENTS = 360;

export interface Installment {
  /** 1-indexado, como aparece na fatura. */
  number: number;
  total: number;
  amountCents: Cents;
  date: Date;
}

/**
 * Datas mensais de um parcelamento fora do cartão (boleto, carnê, crediário).
 *
 * O dia é reaplicado a cada mês a partir de `dueDay` para que uma primeira
 * parcela em 31/01 não vire 28/02 e depois fique presa no dia 28. Meses curtos
 * encurtam a parcela, mas o mês seguinte volta ao dia pretendido.
 *
 * Para compras no cartão use `installmentDatesForCard` (src/lib/credit-card.ts),
 * que respeita o ciclo de fechamento em vez do calendário.
 */
export function monthlyInstallmentDates(
  firstDate: Date,
  count: number,
  dueDay?: number | null,
): Date[] {
  const preferredDay = dueDay ?? firstDate.getUTCDate();
  const dates: Date[] = [firstDate];

  for (let i = 1; i < count; i++) {
    const month = addMonthsUtc(firstDate, i);
    const year = month.getUTCFullYear();
    const month1to12 = month.getUTCMonth() + 1;
    dates.push(utcDate(year, month1to12, Math.min(preferredDay, daysInMonth(year, month1to12))));
  }

  return dates;
}

/**
 * Distribui `totalCents` pelas datas recebidas, sem perder centavo.
 *
 * Recebe as datas já prontas em vez de calculá-las porque quem manda no
 * calendário depende do meio de pagamento: no cartão é o ciclo de fechamento,
 * fora dele é o mês civil. Separar as duas coisas deixa esta função com uma
 * responsabilidade só — o dinheiro.
 */
export function buildInstallments(totalCents: Cents, dates: readonly Date[]): Installment[] {
  const count = dates.length;

  if (!Number.isInteger(count) || count < 2) {
    throw new Error('O parcelamento exige pelo menos 2 parcelas.');
  }
  if (count > MAX_INSTALLMENTS) {
    throw new Error(`O máximo é ${MAX_INSTALLMENTS} parcelas.`);
  }
  if (totalCents <= 0) {
    throw new Error('O total precisa ser maior que zero.');
  }
  /**
   * Sem isto, 1 centavo em 2x daria [1, 0] — e uma parcela de zero não é um
   * lançamento válido: ela some do extrato e a soma das parcelas deixa de
   * bater com a compra. A checagem mora aqui, e não em quem chama, porque esta
   * função também alimenta a prévia do formulário, que não passa pelo Zod.
   */
  if (totalCents < count) {
    throw new Error(`R$ ${(totalCents / 100).toFixed(2)} é pouco para ${count} parcelas.`);
  }

  const amounts = splitEvenly(totalCents, count);

  return dates.map((date, i) => ({
    number: i + 1,
    total: count,
    amountCents: amounts[i]!,
    date,
  }));
}

/** Confere que nada se perdeu. Usado nos testes e como asserção barata. */
export function installmentsSum(parts: readonly Installment[]): Cents {
  return parts.reduce((acc, part) => acc + part.amountCents, 0);
}

/** Rótulo curto, como aparece na fatura: "3/12". */
export function installmentLabel(number: number, total: number): string {
  return `${number}/${total}`;
}
