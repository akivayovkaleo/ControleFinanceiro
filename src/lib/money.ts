/**
 * Dinheiro no Controle Financeiro.
 *
 * REGRA DE OURO: valores monetários são SEMPRE inteiros em centavos.
 * Nunca use `number` com casas decimais para dinheiro — 0.1 + 0.2 !== 0.3 em
 * ponto flutuante, e num app financeiro isso vira centavo perdido no extrato.
 *
 * Toda variável/campo que guarda dinheiro termina em `Cents`.
 */

/** Maior valor que cabe num INTEGER de 32 bits: R$ 21.474.836,47. */
export const MAX_CENTS = 2_147_483_647;

export type Currency = 'BRL' | 'USD' | 'EUR';

const LOCALE_BY_CURRENCY: Record<string, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
};

/**
 * Converte a entrada digitada pelo usuário em centavos.
 *
 * Aceita as formas que uma pessoa realmente digita:
 *   "1.234,56" → 123456   (formato pt-BR)
 *   "1,234.56" → 123456   (formato en-US)
 *   "1234,5"   → 123450
 *   "1234"     → 123400
 *   "R$ 89,90" → 8990
 *   "-50"      → -5000
 *
 * Retorna `null` se a entrada não for um número reconhecível — o chamador
 * decide se isso é erro de validação ou campo vazio.
 */
export function parseAmountToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }

  let raw = input.trim();
  if (raw === '') return null;

  const negative = raw.startsWith('-') || /^\(.*\)$/.test(raw);
  // Remove tudo que não for dígito, vírgula ou ponto.
  raw = raw.replace(/[^\d.,]/g, '');
  if (raw === '') return null;

  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');

  let normalized: string;
  if (lastComma === -1 && lastDot === -1) {
    normalized = raw;
  } else if (lastComma > lastDot) {
    // Vírgula é o separador decimal (pt-BR): pontos são milhar.
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Ponto é o separador decimal (en-US): vírgulas são milhar.
    normalized = raw.replace(/,/g, '');
  } else {
    normalized = raw;
  }

  // Um separador com 3 dígitos após ele e nenhum outro separador é ambíguo
  // ("1.234"): tratamos como milhar, que é a leitura correta em pt-BR.
  const decimalMatch = normalized.match(/\.(\d+)$/);
  if (decimalMatch && decimalMatch[1]!.length === 3 && !/\.\d+\./.test(normalized)) {
    const hadThousandSeparator = lastComma > lastDot ? false : /^\d{1,3}([.,]\d{3})+$/.test(raw);
    if (hadThousandSeparator) normalized = normalized.replace(/\./g, '');
  }

  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;

  const cents = Math.round(value * 100);
  return negative ? -Math.abs(cents) : cents;
}

/** Formata centavos como moeda completa: 123456 → "R$ 1.234,56". */
export function formatCents(cents: number, currency = 'BRL'): string {
  const locale = LOCALE_BY_CURRENCY[currency] ?? 'pt-BR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Formata sem o símbolo da moeda: 123456 → "1.234,56". Útil dentro de inputs. */
export function formatCentsPlain(cents: number, currency = 'BRL'): string {
  const locale = LOCALE_BY_CURRENCY[currency] ?? 'pt-BR';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Formato compacto para gráficos e cartões apertados:
 * 1234567 → "R$ 12,3 mil"; 123456789 → "R$ 1,23 mi".
 */
export function formatCentsCompact(cents: number, currency = 'BRL'): string {
  const locale = LOCALE_BY_CURRENCY[currency] ?? 'pt-BR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

/** Soma segura, sem intermediários em ponto flutuante. */
export function sumCents(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/**
 * Divide `totalCents` em `parts` inteiras cujo somatório é exatamente
 * `totalCents`. O resto de 1 centavo é distribuído nas primeiras posições,
 * de forma determinística (mesma entrada → mesma saída, sempre).
 *
 *   splitEvenly(1000, 3) → [334, 333, 333]
 */
export function splitEvenly(totalCents: number, parts: number): number[] {
  if (parts <= 0) return [];
  const sign = totalCents < 0 ? -1 : 1;
  const abs = Math.abs(totalCents);
  const base = Math.floor(abs / parts);
  const remainder = abs - base * parts;
  return Array.from({ length: parts }, (_, i) => sign * (base + (i < remainder ? 1 : 0)));
}

/**
 * Divide `totalCents` proporcionalmente a `weights`, garantindo que o
 * somatório do resultado seja exatamente `totalCents`.
 *
 * Usa o método do maior resto (largest remainder / Hare-Niemeyer): calcula a
 * parte inteira de cada fatia e entrega os centavos que sobraram a quem tem a
 * maior parte fracionária. Empates são resolvidos pelo índice, para que o
 * resultado seja estável.
 *
 * Se todos os pesos forem zero ou negativos, cai para divisão igual.
 */
export function splitByWeights(totalCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const totalWeight = safeWeights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) return splitEvenly(totalCents, n);

  const sign = totalCents < 0 ? -1 : 1;
  const abs = Math.abs(totalCents);

  const exact = safeWeights.map((w) => (abs * w) / totalWeight);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = abs - floors.reduce((a, b) => a + b, 0);

  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => (b.frac - a.frac) || (a.index - b.index));

  const result = [...floors];
  for (let i = 0; i < order.length && remainder > 0; i++) {
    result[order[i]!.index]! += 1;
    remainder -= 1;
  }

  return result.map((v) => sign * v);
}

/** Converte centavos para número decimal. Use só na borda (gráficos, CSV). */
export function centsToNumber(cents: number): number {
  return cents / 100;
}

/** Valida se o valor cabe no banco e é um inteiro. */
export function isValidCents(cents: number): boolean {
  return Number.isInteger(cents) && Math.abs(cents) <= MAX_CENTS;
}

/** Percentual de `part` sobre `total`, protegido contra divisão por zero. */
export function percentOf(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}
