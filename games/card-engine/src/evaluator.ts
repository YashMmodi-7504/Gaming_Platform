import { CardManager } from './deck';
import { rankBaccaratValue, rankOrder, type Card } from './card';
import type { CardGameRuleSet, EvaluationMode } from './rules';

export interface EvaluatedSide {
  side: string;
  cards: Card[];
  /** Comparable strength — higher is better. */
  score: number;
  category: string;
  total?: number;
}

export interface RoundOutcome {
  mode: EvaluationMode;
  sides: EvaluatedSide[];
  winners: string[];
  isTie: boolean;
  details: Record<string, unknown>;
}

const POKER_CATEGORIES: Record<number, string> = {
  0: 'high-card',
  1: 'pair',
  2: 'two-pair',
  3: 'three-of-a-kind',
  4: 'straight',
  5: 'flush',
  6: 'full-house',
  7: 'four-of-a-kind',
  8: 'straight-flush',
};

const TEEN_PATTI_CATEGORIES: Record<number, string> = {
  0: 'high-card',
  1: 'pair',
  2: 'color',
  3: 'sequence',
  4: 'pure-sequence',
  5: 'trail',
};

const BASE = 15;

function encode(category: number, tiebreakers: number[]): number {
  let score = category;
  for (let i = 0; i < 6; i += 1) {
    score = score * BASE + (tiebreakers[i] ?? 0);
  }
  return score;
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k <= 0) return [[]];
  if (k > items.length) return [];
  const [first, ...rest] = items;
  const withFirst = combinations(rest, k - 1).map((c) => [first!, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function bestStraightHigh(orders: number[], size: number): number | null {
  const set = new Set(orders);
  if (orders.includes(14)) set.add(1); // ace can be low for the wheel
  const sorted = [...set].sort((a, b) => a - b);
  let best: number | null = null;
  for (let i = 0; i + size - 1 < sorted.length; i += 1) {
    let consecutive = true;
    for (let j = 1; j < size; j += 1) {
      if (sorted[i + j]! !== sorted[i]! + j) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) best = sorted[i + size - 1]!;
  }
  return best;
}

/** Score a non-wild hand of exactly `size` cards. */
function scoreFixed(cards: Card[], style: '3-card' | 'standard'): number {
  const orders = cards.map((c) => rankOrder(c.rank, true)).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0]!.suit);
  const straightHigh = bestStraightHigh(orders, cards.length);

  const counts = new Map<number, number>();
  for (const o of orders) counts.set(o, (counts.get(o) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const kickers = orders;

  if (style === '3-card') {
    if (groups[0]?.[1] === 3) return encode(5, [groups[0][0]]);
    if (straightHigh !== null && isFlush) return encode(4, [straightHigh]);
    if (straightHigh !== null) return encode(3, [straightHigh]);
    if (isFlush) return encode(2, kickers);
    if (groups[0]?.[1] === 2) return encode(1, [groups[0][0], ...orders.filter((o) => o !== groups[0]![0])]);
    return encode(0, kickers);
  }

  // standard 5-card
  if (straightHigh !== null && isFlush) return encode(8, [straightHigh]);
  if (groups[0]?.[1] === 4) return encode(7, [groups[0][0], groups[1]?.[0] ?? 0]);
  if (groups[0]?.[1] === 3 && groups[1]?.[1] === 2) return encode(6, [groups[0][0], groups[1][0]]);
  if (isFlush) return encode(5, kickers);
  if (straightHigh !== null) return encode(4, [straightHigh]);
  if (groups[0]?.[1] === 3) return encode(3, [groups[0][0], ...orders.filter((o) => o !== groups[0]![0])]);
  if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2) {
    const pairHigh = Math.max(groups[0][0], groups[1][0]);
    const pairLow = Math.min(groups[0][0], groups[1][0]);
    return encode(2, [pairHigh, pairLow, ...orders.filter((o) => o !== pairHigh && o !== pairLow)]);
  }
  if (groups[0]?.[1] === 2) return encode(1, [groups[0][0], ...orders.filter((o) => o !== groups[0]![0])]);
  return encode(0, kickers);
}

const SUBSTITUTES: Array<Card['rank']> = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** Best poker score for a set of cards, accounting for jokers (wild) and best-of-N. */
export function pokerScore(cards: Card[], evalSize: number): { score: number; category: string } {
  const style = evalSize === 3 ? '3-card' : 'standard';
  const jokers = cards.filter((c) => CardManager.isJoker(c));
  const fixed = cards.filter((c) => !CardManager.isJoker(c));

  const evaluateSet = (set: Card[]): number => {
    if (set.length <= evalSize) return scoreFixed(set, style);
    return combinations(set, evalSize).reduce((best, combo) => Math.max(best, scoreFixed(combo, style)), 0);
  };

  if (jokers.length === 0) {
    const score = evaluateSet(fixed);
    return { score, category: categoryName(score, style) };
  }

  // Substitute each joker with the best possible non-wild card (brute force).
  let best = 0;
  const substitute = (remaining: number, acc: Card[]): void => {
    if (remaining === 0) {
      best = Math.max(best, evaluateSet([...fixed, ...acc]));
      return;
    }
    for (const rank of SUBSTITUTES) {
      substitute(remaining - 1, [...acc, CardManager.create(rank, fixed[0]?.suit ?? 'spades')]);
    }
  };
  substitute(Math.min(jokers.length, 2), []);
  return { score: best, category: categoryName(best, style) };
}

function categoryName(score: number, style: '3-card' | 'standard'): string {
  const category = Math.floor(score / BASE ** 6);
  return (style === '3-card' ? TEEN_PATTI_CATEGORIES : POKER_CATEGORIES)[category] ?? 'high-card';
}

/**
 * Generic winner evaluation. The strategy is selected by the ruleset; all
 * strategies are reusable across games.
 */
export const WinnerEvaluator = {
  evaluate(
    ruleset: CardGameRuleSet,
    sides: Record<string, Card[]>,
    community: Card[] = [],
  ): RoundOutcome {
    const mode = ruleset.evaluationMode;
    const entries = Object.entries(sides);
    let evaluated: EvaluatedSide[];

    switch (mode) {
      case 'poker-rank': {
        const evalSize = ruleset.handSize >= 5 || ruleset.communityCards > 0 ? 5 : ruleset.handSize;
        evaluated = entries.map(([side, cards]) => {
          const { score, category } = pokerScore([...cards, ...community], evalSize);
          return { side, cards, score, category };
        });
        break;
      }
      case 'high-card': {
        evaluated = entries.map(([side, cards]) => ({
          side,
          cards,
          score: rankOrder(cards[0]?.rank ?? '2', ruleset.aceHigh),
          category: 'high-card',
        }));
        break;
      }
      case 'point-total': {
        evaluated = entries.map(([side, cards]) => {
          const total = cards.reduce((sum, c) => sum + rankBaccaratValue(c.rank), 0) % 10;
          return { side, cards, score: total, category: `total-${total}`, total };
        });
        break;
      }
      case 'sum-points': {
        evaluated = entries.map(([side, cards]) => {
          const total = cards.reduce((sum, c) => sum + CardManager.faceValue(c.rank), 0);
          return { side, cards, score: total, category: `sum-${total}`, total };
        });
        break;
      }
      case 'over-under': {
        const card = entries[0]?.[1]?.[0];
        const order = card ? rankOrder(card.rank, ruleset.aceHigh) : 0;
        const result = order > ruleset.target ? 'over' : order < ruleset.target ? 'under' : 'equal';
        return {
          mode,
          sides: card ? [{ side: result, cards: [card], score: order, category: result }] : [],
          winners: [result],
          isTie: false,
          details: { card: card?.rank, target: ruleset.target, result },
        };
      }
      default:
        evaluated = entries.map(([side, cards]) => ({ side, cards, score: 0, category: 'n/a' }));
    }

    const best = Math.max(...evaluated.map((e) => e.score));
    const winners = evaluated.filter((e) => e.score === best).map((e) => e.side);
    return {
      mode,
      sides: evaluated,
      winners,
      isTie: winners.length > 1,
      details: { best },
    };
  },
};
