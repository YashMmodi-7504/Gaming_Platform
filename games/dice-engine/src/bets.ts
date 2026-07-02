import type { DiceSet } from './dice';
import {
  RuleResolver,
  RuleValidationError,
  totalBounds,
  type BetDefinition,
  type DiceGameRuleSet,
} from './rules';

export interface DiceBet {
  /** Bet type key from the ruleset (e.g. `big`, `triple-any`, `single-6`). */
  type: string;
  amount: string;
}

export interface BetSettlement {
  type: string;
  amount: string;
  outcome: 'won' | 'lost';
  /** Effective return multiplier applied (accounts for per-occurrence singles). */
  payout: number;
  returned: string;
}

export interface DiceSettlement {
  bets: BetSettlement[];
  totalBet: string;
  totalWin: string;
  net: string;
}

/** The midpoint that splits Small (≤) from Big (>) for a configuration. */
function smallCeiling(ruleset: DiceGameRuleSet): number {
  const { min, max } = totalBounds(ruleset);
  return Math.floor((min + max) / 2);
}

/**
 * Evaluates bets against a dice roll. Entirely driven by the ruleset + bet
 * definition — no per-variant branches.
 */
export const ResultEvaluator = {
  /** Does the bet win against the roll? */
  wins(ruleset: DiceGameRuleSet, def: BetDefinition, set: DiceSet): boolean {
    const total = set.total();
    const values = def.values ?? [];
    const isTriple = set.isTriple();

    switch (def.match) {
      case 'total':
        return values.includes(total);
      case 'total-range':
        return total >= (values[0] ?? 0) && total <= (values[1] ?? 0);
      case 'big':
        if (ruleset.houseRules.triplesBeatBigSmall && isTriple) return false;
        return total > smallCeiling(ruleset);
      case 'small':
        if (ruleset.houseRules.triplesBeatBigSmall && isTriple) return false;
        return total <= smallCeiling(ruleset);
      case 'odd':
        if (ruleset.houseRules.triplesBeatOddEven && isTriple) return false;
        return total % 2 === 1;
      case 'even':
        if (ruleset.houseRules.triplesBeatOddEven && isTriple) return false;
        return total % 2 === 0;
      case 'any-triple':
        return isTriple;
      case 'specific-triple':
        return isTriple && set.dice[0]?.value === values[0];
      case 'any-double':
        return set.hasOfAKind(2);
      case 'specific-double':
        return set.occurrences(values[0] ?? -1) >= 2;
      case 'single':
        return set.occurrences(values[0] ?? -1) >= 1;
      case 'combination':
        return set.occurrences(values[0] ?? -1) >= 1 && set.occurrences(values[1] ?? -1) >= 1;
      default:
        return false;
    }
  },

  /** Effective return multiplier for a winning bet (per-occurrence aware). */
  multiplier(def: BetDefinition, set: DiceSet): number {
    if (def.perOccurrence && def.match === 'single') {
      // Standard single: 1:1 per matching die ⇒ total return 1 + occurrences.
      return 1 + set.occurrences(def.values?.[0] ?? -1);
    }
    return def.payout;
  },

  /** Describe a roll's headline properties (for stats / UI). */
  describe(ruleset: DiceGameRuleSet, set: DiceSet): Record<string, unknown> {
    const total = set.total();
    const isTriple = set.isTriple();
    return {
      values: set.values(),
      total,
      isTriple,
      isDouble: !isTriple && set.hasOfAKind(2),
      parity: total % 2 === 0 ? 'even' : 'odd',
      range: total > smallCeiling(ruleset) ? 'big' : 'small',
    };
  },
};

/** Validates placed bets against the ruleset's bet types and table limits. */
export const BetValidator = {
  validate(ruleset: DiceGameRuleSet, bets: DiceBet[]): DiceBet[] {
    if (bets.length === 0) throw new RuleValidationError('At least one bet is required');
    const { min, max, tableMax } = ruleset.limits;
    let total = 0;

    for (const bet of bets) {
      const def = RuleResolver.bet(ruleset, bet.type);
      if (!def) throw new RuleValidationError(`Bet "${bet.type}" is not allowed for ${ruleset.key}`);
      const amount = Number(bet.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        throw new RuleValidationError(`Bet "${bet.type}" amount must be a positive number`);
      }
      if (amount < min || amount > max) {
        throw new RuleValidationError(`Bet "${bet.type}" must be between ${min} and ${max}`);
      }
      total += amount;
    }

    if (total > tableMax) {
      throw new RuleValidationError(`Total stake ${total} exceeds table maximum ${tableMax}`);
    }
    return bets;
  },
};

/** Settles every placed bet against the dice roll. */
export const PayoutCalculator = {
  settle(ruleset: DiceGameRuleSet, bets: DiceBet[], set: DiceSet): DiceSettlement {
    let totalBet = 0;
    let totalWin = 0;

    const settled: BetSettlement[] = bets.map((bet) => {
      const amount = Number(bet.amount);
      totalBet += amount;
      const def = RuleResolver.bet(ruleset, bet.type)!;
      const won = ResultEvaluator.wins(ruleset, def, set);
      if (won) {
        const multiplier = ResultEvaluator.multiplier(def, set);
        const returned = amount * multiplier;
        totalWin += returned;
        return { type: bet.type, amount: bet.amount, outcome: 'won', payout: multiplier, returned: returned.toString() };
      }
      return { type: bet.type, amount: bet.amount, outcome: 'lost', payout: 0, returned: '0' };
    });

    return {
      bets: settled,
      totalBet: totalBet.toString(),
      totalWin: totalWin.toString(),
      net: (totalWin - totalBet).toString(),
    };
  },
};

/** Alias kept parallel to the other engines' `ResultCalculator` naming. */
export const ResultCalculator = PayoutCalculator;

/**
 * Stateful per-round bet collector. Mirrors a live table where chips are added,
 * undone, repeated and doubled before the roll. Pure data; the engine consumes
 * the assembled list.
 */
export class BetManager {
  private bets: DiceBet[] = [];
  private lastRound: DiceBet[] = [];

  place(bet: DiceBet): void {
    this.bets.push(bet);
  }

  undo(): DiceBet | undefined {
    return this.bets.pop();
  }

  clear(): void {
    this.bets = [];
  }

  /** Re-place the bets from the previous settled round. */
  repeat(): void {
    this.bets = this.lastRound.map((b) => ({ ...b }));
  }

  /** Double every staked chip currently on the table. */
  double(): void {
    this.bets = this.bets.map((b) => ({ ...b, amount: (Number(b.amount) * 2).toString() }));
  }

  total(): number {
    return this.bets.reduce((sum, b) => sum + Number(b.amount), 0);
  }

  list(): DiceBet[] {
    return [...this.bets];
  }

  /** Snapshot the current bets as the repeatable "last round" and reset. */
  commit(): DiceBet[] {
    this.lastRound = this.bets.map((b) => ({ ...b }));
    const committed = this.list();
    this.clear();
    return committed;
  }
}
