import { describe, expect, it } from 'vitest';
import {
  formatCents,
  parseAmountToCents,
  splitByWeights,
  splitEvenly,
  sumCents,
} from '@/lib/money';

describe('parseAmountToCents', () => {
  it('entende o formato brasileiro', () => {
    expect(parseAmountToCents('1.234,56')).toBe(123456);
    expect(parseAmountToCents('89,90')).toBe(8990);
    expect(parseAmountToCents('0,05')).toBe(5);
    expect(parseAmountToCents('1.000.000,00')).toBe(100000000);
  });

  it('entende o formato americano', () => {
    expect(parseAmountToCents('1,234.56')).toBe(123456);
    expect(parseAmountToCents('89.90')).toBe(8990);
  });

  it('aceita o que a pessoa realmente digita', () => {
    expect(parseAmountToCents('R$ 89,90')).toBe(8990);
    expect(parseAmountToCents('  50 ')).toBe(5000);
    expect(parseAmountToCents('1234')).toBe(123400);
    expect(parseAmountToCents('12,5')).toBe(1250);
  });

  it('trata "1.234" como mil duzentos e trinta e quatro, não 1,234', () => {
    expect(parseAmountToCents('1.234')).toBe(123400);
  });

  it('preserva o sinal negativo', () => {
    expect(parseAmountToCents('-50')).toBe(-5000);
    expect(parseAmountToCents('-1.234,56')).toBe(-123456);
  });

  it('devolve null para entrada não numérica', () => {
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('   ')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
    expect(parseAmountToCents(null)).toBeNull();
    expect(parseAmountToCents(undefined)).toBeNull();
  });

  it('nunca produz fração de centavo', () => {
    for (const input of ['0,1', '33,333', '10,005', '1,999']) {
      const cents = parseAmountToCents(input);
      expect(Number.isInteger(cents)).toBe(true);
    }
  });
});

describe('formatCents', () => {
  it('formata em reais', () => {
    //   = espaço não separável que o Intl usa depois de "R$".
    expect(formatCents(123456).replace(/ /g, ' ')).toBe('R$ 1.234,56');
    expect(formatCents(0).replace(/ /g, ' ')).toBe('R$ 0,00');
  });

  it('é o inverso de parseAmountToCents', () => {
    for (const cents of [0, 1, 99, 100, 12345, 999999999]) {
      expect(parseAmountToCents(formatCents(cents))).toBe(cents);
    }
  });
});

describe('splitEvenly', () => {
  it('divide exato quando dá', () => {
    expect(splitEvenly(1000, 2)).toEqual([500, 500]);
    expect(splitEvenly(900, 3)).toEqual([300, 300, 300]);
  });

  it('distribui o centavo que sobra sem perder nada', () => {
    expect(splitEvenly(1000, 3)).toEqual([334, 333, 333]);
    expect(splitEvenly(1, 2)).toEqual([1, 0]);
    expect(splitEvenly(10, 3)).toEqual([4, 3, 3]);
  });

  it('a soma é sempre o total, para qualquer entrada', () => {
    for (let total = 0; total < 400; total++) {
      for (let parts = 1; parts <= 7; parts++) {
        expect(sumCents(splitEvenly(total, parts))).toBe(total);
      }
    }
  });

  it('lida com valores negativos', () => {
    expect(sumCents(splitEvenly(-1000, 3))).toBe(-1000);
    expect(splitEvenly(-1000, 2)).toEqual([-500, -500]);
  });

  it('devolve vazio para zero partes', () => {
    expect(splitEvenly(100, 0)).toEqual([]);
  });
});

describe('splitByWeights', () => {
  it('divide proporcionalmente', () => {
    expect(splitByWeights(3000, [2, 1])).toEqual([2000, 1000]);
    expect(splitByWeights(10000, [7000, 3000])).toEqual([7000, 3000]);
  });

  it('a soma é sempre o total, mesmo com resto', () => {
    expect(sumCents(splitByWeights(1000, [1, 1, 1]))).toBe(1000);
    expect(sumCents(splitByWeights(100, [1, 2, 3, 4, 5]))).toBe(100);
    for (let total = 0; total < 300; total++) {
      expect(sumCents(splitByWeights(total, [3, 7]))).toBe(total);
      expect(sumCents(splitByWeights(total, [1, 1, 1]))).toBe(total);
    }
  });

  it('cai para divisão igual quando não há peso válido', () => {
    expect(splitByWeights(1000, [0, 0])).toEqual([500, 500]);
    expect(splitByWeights(1000, [-5, -5])).toEqual([500, 500]);
  });

  it('é determinístico: mesma entrada, mesma saída', () => {
    const a = splitByWeights(1000, [1, 1, 1]);
    const b = splitByWeights(1000, [1, 1, 1]);
    expect(a).toEqual(b);
  });

  it('caso real: renda 5.000 e 3.000 dividindo uma conta de 1.000', () => {
    // Pesos em centavos, valor em centavos.
    const parts = splitByWeights(100000, [500000, 300000]);
    expect(parts).toEqual([62500, 37500]);
    expect(sumCents(parts)).toBe(100000);
  });
});
