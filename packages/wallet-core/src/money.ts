/**
 * Exact decimal money arithmetic. Amounts are decimal strings; internally they
 * are scaled `bigint` values at 18 fractional digits (matching the database
 * `Decimal(38, 18)` columns). Using `bigint` eliminates floating-point drift —
 * the root cause of balance corruption — so every operation is exact.
 */

export const MONEY_SCALE = 18;
const FACTOR = 10n ** BigInt(MONEY_SCALE);

export class MoneyError extends Error {}

/** Parse a decimal string into a scaled bigint (18 dp). */
export function parseMoney(value: string | number): bigint {
  const str = typeof value === 'number' ? value.toString() : value.trim();
  if (str === '' || !/^[+-]?\d*(\.\d*)?$/.test(str)) {
    throw new MoneyError(`Invalid money value "${value}"`);
  }
  const negative = str.startsWith('-');
  const unsigned = str.replace(/^[+-]/, '');
  const [intPart = '0', fracPartRaw = ''] = unsigned.split('.');
  const fracPart = (fracPartRaw + '0'.repeat(MONEY_SCALE)).slice(0, MONEY_SCALE);
  const scaled = BigInt(intPart || '0') * FACTOR + BigInt(fracPart || '0');
  return negative ? -scaled : scaled;
}

/** Format a scaled bigint back into a canonical decimal string. */
export function formatMoney(scaled: bigint): string {
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const intPart = abs / FACTOR;
  const fracPart = abs % FACTOR;
  const frac = fracPart.toString().padStart(MONEY_SCALE, '0').replace(/0+$/, '');
  const body = frac.length > 0 ? `${intPart}.${frac}` : `${intPart}`;
  return negative && body !== '0' ? `-${body}` : body;
}

/** The canonical money value type used at the boundaries (decimal string). */
export type Money = string;

export const Money = {
  ZERO: '0' as Money,

  of(value: string | number): Money {
    return formatMoney(parseMoney(value));
  },

  add(a: Money, b: Money): Money {
    return formatMoney(parseMoney(a) + parseMoney(b));
  },

  sub(a: Money, b: Money): Money {
    return formatMoney(parseMoney(a) - parseMoney(b));
  },

  neg(a: Money): Money {
    return formatMoney(-parseMoney(a));
  },

  abs(a: Money): Money {
    const v = parseMoney(a);
    return formatMoney(v < 0n ? -v : v);
  },

  /** Multiply two decimal values (e.g. stake × multiplier). */
  mul(a: Money, b: Money): Money {
    return formatMoney((parseMoney(a) * parseMoney(b)) / FACTOR);
  },

  cmp(a: Money, b: Money): -1 | 0 | 1 {
    const av = parseMoney(a);
    const bv = parseMoney(b);
    return av < bv ? -1 : av > bv ? 1 : 0;
  },

  eq(a: Money, b: Money): boolean {
    return parseMoney(a) === parseMoney(b);
  },

  gt(a: Money, b: Money): boolean {
    return parseMoney(a) > parseMoney(b);
  },

  gte(a: Money, b: Money): boolean {
    return parseMoney(a) >= parseMoney(b);
  },

  lt(a: Money, b: Money): boolean {
    return parseMoney(a) < parseMoney(b);
  },

  lte(a: Money, b: Money): boolean {
    return parseMoney(a) <= parseMoney(b);
  },

  isZero(a: Money): boolean {
    return parseMoney(a) === 0n;
  },

  isNegative(a: Money): boolean {
    return parseMoney(a) < 0n;
  },

  isPositive(a: Money): boolean {
    return parseMoney(a) > 0n;
  },

  min(a: Money, b: Money): Money {
    return Money.lte(a, b) ? Money.of(a) : Money.of(b);
  },

  max(a: Money, b: Money): Money {
    return Money.gte(a, b) ? Money.of(a) : Money.of(b);
  },

  sum(values: Money[]): Money {
    return formatMoney(values.reduce((acc, v) => acc + parseMoney(v), 0n));
  },
};
