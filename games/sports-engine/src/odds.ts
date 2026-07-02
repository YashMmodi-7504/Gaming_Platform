import type { Market, OddsFormat } from './types';

/** Round to 2 decimals. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Greatest common divisor for fractional formatting. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Odds utilities: format conversion, implied probability, book margin
 * (overround) and payout maths. All decimal-odds based — the single source of
 * truth across the engine.
 */
export const OddsManager = {
  /** Implied probability of decimal odds (0..1). */
  impliedProbability(decimal: number): number {
    return decimal > 0 ? 1 / decimal : 0;
  },

  /** Book margin / overround for a market (sum of implied probabilities − 1). */
  overround(market: Market): number {
    const sum = market.selections.reduce((acc, s) => acc + OddsManager.impliedProbability(s.odds), 0);
    return round2(sum - 1);
  },

  /** Combined decimal odds for a set of legs (product). */
  combine(oddsList: number[]): number {
    if (oddsList.length === 0) return 0;
    return round2(oddsList.reduce((product, o) => product * o, 1));
  },

  /** Potential return for a stake at given combined odds. */
  payout(stake: number, combinedOdds: number): number {
    return round2(stake * combinedOdds);
  },

  /** Convert decimal odds to another display format. */
  format(decimal: number, format: OddsFormat): string {
    if (format === 'decimal') return decimal.toFixed(2);
    if (format === 'american') {
      if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
      return `${Math.round(-100 / (decimal - 1))}`;
    }
    // Fractional.
    const numerator = Math.round((decimal - 1) * 100);
    const denominator = 100;
    const divisor = gcd(numerator, denominator) || 1;
    return `${numerator / divisor}/${denominator / divisor}`;
  },

  /** Parse any supported odds format back to decimal. */
  toDecimal(value: string, format: OddsFormat): number {
    if (format === 'decimal') return Number(value);
    if (format === 'american') {
      const n = Number(value);
      return n > 0 ? round2(n / 100 + 1) : round2(100 / -n + 1);
    }
    const [num, den] = value.split('/').map(Number);
    return round2((num ?? 0) / (den ?? 1) + 1);
  },
};
