import { Money, formatMoney, parseMoney } from '@gaming-platform/wallet-core';

import type { Award, PrizeConfig } from './types';

export class PrizeError extends Error {}

export interface RankedEntry {
  participantId: string;
  userId: string;
  rank: number;
}

/**
 * Compute the total prize pool: the guaranteed base plus a configurable share of
 * the collected entry fees (dynamic / overlay pools).
 */
export function computePool(config: PrizeConfig, entrants: number, entryFee: string): string {
  const dynamic = Money.mul(
    Money.mul(entryFee, entrants.toString()),
    config.entryContribution.toString(),
  );
  return Money.add(config.guaranteed, dynamic);
}

/** Split a scaled bigint amount into `parts` equal shares, remainder to the first. */
function splitEven(totalScaled: bigint, parts: number): bigint[] {
  if (parts <= 0) return [];
  const base = totalScaled / BigInt(parts);
  const remainder = totalScaled - base * BigInt(parts);
  return Array.from({ length: parts }, (_, i) => (i === 0 ? base + remainder : base));
}

/**
 * Distribute a prize pool across ranked entries per the configured strategy.
 * Cash strategies (`winner-take-all`, `percentage`, `even-split`) are split with
 * exact bigint arithmetic so the awards sum to the pool **to the last minor
 * unit** (any rounding remainder goes to first place). `fixed` pays the tier's
 * absolute amounts (sponsored pools). Non-cash reward slugs ride along per tier.
 */
export function distributePrizes(config: PrizeConfig, pool: string, ranked: RankedEntry[]): Award[] {
  const poolScaled = parseMoney(pool);
  const sorted = [...ranked].sort((a, b) => a.rank - b.rank);
  const awards: Award[] = [];

  const push = (entry: RankedEntry, amountScaled: bigint, rewardSlugs: string[]): void => {
    awards.push({
      rank: entry.rank,
      participantId: entry.participantId,
      userId: entry.userId,
      amount: formatMoney(amountScaled < 0n ? 0n : amountScaled),
      rewardSlugs,
    });
  };
  const inRange = (from: number, to: number): RankedEntry[] => sorted.filter((e) => e.rank >= from && e.rank <= to);
  /** Award a total to a set of entries, splitting ties evenly (remainder to first). */
  const splitAmong = (entries: RankedEntry[], totalScaled: bigint, rewardSlugs: string[]): bigint => {
    const shares = splitEven(totalScaled, entries.length);
    entries.forEach((e, i) => push(e, shares[i] ?? 0n, rewardSlugs));
    return totalScaled;
  };

  if (config.type === 'winner-take-all') {
    const winners = inRange(sorted[0]?.rank ?? 1, sorted[0]?.rank ?? 1);
    if (winners.length) splitAmong(winners, poolScaled, config.tiers[0]?.rewardSlugs ?? []);
    return awards;
  }

  if (config.type === 'even-split') {
    const n = config.tiers[0]?.toRank ?? ranked.length;
    const top = sorted.slice(0, n);
    if (top.length) splitAmong(top, poolScaled, []);
    return awards;
  }

  if (config.type === 'fixed') {
    for (const tier of config.tiers) {
      for (const entry of inRange(tier.fromRank, tier.toRank)) {
        push(entry, parseMoney(tier.value.toString()), tier.rewardSlugs ?? []);
      }
    }
    return awards;
  }

  // percentage / top-n: each tier's `value` is a share (0..1) of the pool, split
  // evenly across the participants who finished within the tier's rank range.
  let allocated = 0n;
  for (const tier of [...config.tiers].sort((a, b) => a.fromRank - b.fromRank)) {
    const entries = inRange(tier.fromRank, tier.toRank);
    if (entries.length === 0) continue;
    const tierTotal = parseMoney(Money.mul(pool, tier.value.toString()));
    allocated += splitAmong(entries, tierTotal, tier.rewardSlugs ?? []);
  }
  // Any whole-pool rounding remainder goes to the first (highest) award.
  if (awards.length > 0) {
    const remainder = poolScaled - allocated;
    if (remainder !== 0n) {
      awards[0]!.amount = formatMoney(parseMoney(awards[0]!.amount) + remainder);
    }
  }
  return awards;
}

/** Total of all cash awards (for verification / reconciliation). */
export function awardsTotal(awards: Award[]): string {
  return Money.sum(awards.map((a) => a.amount));
}
