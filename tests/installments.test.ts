import { describe, expect, it } from 'vitest';
import {
  buildInstallments,
  installmentLabel,
  installmentsSum,
  monthlyInstallmentDates,
  MAX_INSTALLMENTS,
} from '@/lib/installments';
import { installmentDatesForCard, type CardConfig } from '@/lib/credit-card';
import { utcDate } from '@/lib/date';

const iso = (date: Date) => date.toISOString().slice(0, 10);
const datesFrom = (first: Date, count: number) => monthlyInstallmentDates(first, count);

describe('buildInstallments — a soma nunca pode se perder', () => {
  it('divide 100,00 em 3 sem perder o centavo', () => {
    const parts = buildInstallments(10000, datesFrom(utcDate(2026, 3, 5), 3));
    expect(parts.map((p) => p.amountCents)).toEqual([3334, 3333, 3333]);
    expect(installmentsSum(parts)).toBe(10000);
  });

  it('a soma bate para qualquer total e qualquer número de parcelas', () => {
    for (let total = 2; total <= 400; total++) {
      for (let count = 2; count <= 12; count++) {
        if (total < count) continue;
        const parts = buildInstallments(total, datesFrom(utcDate(2026, 3, 5), count));
        expect(installmentsSum(parts)).toBe(total);
      }
    }
  });

  it('o centavo que sobra vai para as primeiras parcelas, como na fatura', () => {
    const parts = buildInstallments(10, datesFrom(utcDate(2026, 3, 5), 4));
    expect(parts.map((p) => p.amountCents)).toEqual([3, 3, 2, 2]);
  });

  it('numera as parcelas a partir de 1 e guarda o total', () => {
    const parts = buildInstallments(30000, datesFrom(utcDate(2026, 3, 5), 3));
    expect(parts.map((p) => p.number)).toEqual([1, 2, 3]);
    expect(parts.every((p) => p.total === 3)).toBe(true);
  });

  it('nenhuma parcela sai zerada', () => {
    const parts = buildInstallments(3, datesFrom(utcDate(2026, 3, 5), 3));
    expect(parts.every((p) => p.amountCents > 0)).toBe(true);
  });

  it('recusa um total pequeno demais para o número de parcelas', () => {
    // 1 centavo em 2x daria [1, 0] — e parcela de zero some do extrato.
    expect(() => buildInstallments(1, datesFrom(utcDate(2026, 3, 5), 2))).toThrow(/pouco/);
  });

  it('recusa total zerado ou negativo', () => {
    expect(() => buildInstallments(0, datesFrom(utcDate(2026, 3, 5), 2))).toThrow();
    expect(() => buildInstallments(-5000, datesFrom(utcDate(2026, 3, 5), 2))).toThrow();
  });

  it('recusa menos de 2 parcelas — isso é uma compra à vista', () => {
    expect(() => buildInstallments(10000, datesFrom(utcDate(2026, 3, 5), 1))).toThrow(
      /pelo menos 2/,
    );
  });

  it('recusa acima do teto', () => {
    const dates = Array.from({ length: MAX_INSTALLMENTS + 1 }, () => utcDate(2026, 3, 5));
    expect(() => buildInstallments(10_000_000, dates)).toThrow(/máximo/);
  });
});

describe('monthlyInstallmentDates', () => {
  it('mantém o dia mês a mês', () => {
    const dates = monthlyInstallmentDates(utcDate(2026, 3, 5), 3);
    expect(dates.map(iso)).toEqual(['2026-03-05', '2026-04-05', '2026-05-05']);
  });

  it('encurta em fevereiro sem prender o dia nos meses seguintes', () => {
    const dates = monthlyInstallmentDates(utcDate(2026, 1, 31), 4);
    expect(dates.map(iso)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('respeita um dia de vencimento diferente do da primeira parcela', () => {
    const dates = monthlyInstallmentDates(utcDate(2026, 3, 5), 3, 20);
    expect(dates.map(iso)).toEqual(['2026-03-05', '2026-04-20', '2026-05-20']);
  });

  it('atravessa a virada do ano', () => {
    const dates = monthlyInstallmentDates(utcDate(2026, 11, 15), 4);
    expect(dates.map(iso)).toEqual(['2026-11-15', '2026-12-15', '2027-01-15', '2027-02-15']);
  });
});

describe('parcelamento no cartão', () => {
  const card: CardConfig = {
    closingDay: 10,
    dueDay: 17,
    limitCents: null,
    statementInclusive: true,
  };

  it('valor e datas combinam: 12x de uma compra fecham o total', () => {
    const dates = installmentDatesForCard(utcDate(2026, 3, 5), 12, card);
    const parts = buildInstallments(99999, dates);
    expect(parts).toHaveLength(12);
    expect(installmentsSum(parts)).toBe(99999);
  });
});

describe('installmentLabel', () => {
  it('formata como na fatura', () => {
    expect(installmentLabel(3, 12)).toBe('3/12');
  });
});
