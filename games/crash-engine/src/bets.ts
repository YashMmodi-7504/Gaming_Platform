import { RuleValidationError, type CrashGameRuleSet } from './rules';

export interface CrashBet {
  amount: string;
  /** Optional auto cash-out multiplier; the bet is taken automatically here. */
  autoCashout?: number;
}

export interface BetSettlement {
  amount: string;
  autoCashout: number | null;
  /** Multiplier the bet was actually taken at, or null if it rode to bust. */
  cashedOutAt: number | null;
  outcome: 'won' | 'lost';
  /** Effective multiplier applied to the stake (0 when lost). */
  payout: number;
  returned: string;
}

export interface CrashSettlement {
  bets: BetSettlement[];
  totalBet: string;
  totalWin: string;
  net: string;
}

/** Round a multiplier down to 2 decimals. */
function floor2(value: number): number {
  return Math.floor(value * 100) / 100;
}

/**
 * Decides the multiplier a bet is taken at. Auto and manual cash-outs are both
 * candidates; the earliest one that fires strictly before the crash wins. A
 * cash-out at or above the crash point misses (the bust happened first).
 */
export const CashoutManager = {
  resolve(
    ruleset: CrashGameRuleSet,
    bet: CrashBet,
    crashPoint: number,
    manualCashout: number | null = null,
  ): number | null {
    const candidates: number[] = [];
    if (ruleset.allowAutoCashout && typeof bet.autoCashout === 'number') {
      candidates.push(bet.autoCashout);
    }
    if (ruleset.allowManualCashout && typeof manualCashout === 'number') {
      candidates.push(manualCashout);
    }
    if (candidates.length === 0) return null;
    // Cap requested cash-outs to the table ceiling, then take the earliest one.
    const capped = candidates.map((c) => Math.min(c, ruleset.maxMultiplier));
    const earliest = Math.min(...capped);
    return earliest < crashPoint ? floor2(earliest) : null;
  },
};

/** Evaluates a bet's outcome against a crash point. */
export const ResultEvaluator = {
  outcome(
    ruleset: CrashGameRuleSet,
    bet: CrashBet,
    crashPoint: number,
    manualCashout: number | null = null,
  ): { won: boolean; cashedOutAt: number | null } {
    const cashedOutAt = CashoutManager.resolve(ruleset, bet, crashPoint, manualCashout);
    return { won: cashedOutAt !== null, cashedOutAt };
  },

  describe(crashPoint: number): Record<string, unknown> {
    return {
      crashPoint,
      band:
        crashPoint < 2 ? 'low' : crashPoint < 10 ? 'mid' : crashPoint < 100 ? 'high' : 'extreme',
    };
  },
};

/** Validates placed bets against the ruleset's limits and cash-out rules. */
export const BetValidator = {
  validate(ruleset: CrashGameRuleSet, bets: CrashBet[]): CrashBet[] {
    if (bets.length === 0) throw new RuleValidationError('At least one bet is required');
    const { min, max, tableMax } = ruleset.limits;
    let total = 0;

    for (const bet of bets) {
      const amount = Number(bet.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        throw new RuleValidationError('Bet amount must be a positive number');
      }
      if (amount < min || amount > max) {
        throw new RuleValidationError(`Bet must be between ${min} and ${max}`);
      }
      total += amount;

      if (typeof bet.autoCashout === 'number') {
        if (!ruleset.allowAutoCashout) {
          throw new RuleValidationError('Auto cash-out is not allowed on this table');
        }
        if (bet.autoCashout <= ruleset.minMultiplier) {
          throw new RuleValidationError(`Auto cash-out must exceed ${ruleset.minMultiplier}`);
        }
        if (bet.autoCashout > ruleset.maxMultiplier) {
          throw new RuleValidationError(`Auto cash-out cannot exceed ${ruleset.maxMultiplier}`);
        }
      }
    }

    if (total > tableMax) {
      throw new RuleValidationError(`Total stake ${total} exceeds table maximum ${tableMax}`);
    }
    return bets;
  },
};

/** Settles every placed bet against the crash point. */
export const PayoutCalculator = {
  settle(
    ruleset: CrashGameRuleSet,
    bets: CrashBet[],
    crashPoint: number,
    manualCashouts: Array<number | null> = [],
  ): CrashSettlement {
    let totalBet = 0;
    let totalWin = 0;

    const settled: BetSettlement[] = bets.map((bet, i) => {
      const amount = Number(bet.amount);
      totalBet += amount;
      const cashedOutAt = CashoutManager.resolve(ruleset, bet, crashPoint, manualCashouts[i] ?? null);
      const autoCashout = typeof bet.autoCashout === 'number' ? bet.autoCashout : null;

      if (cashedOutAt !== null) {
        const returned = Math.min(amount * cashedOutAt, ruleset.maxPayout);
        totalWin += returned;
        return {
          amount: bet.amount,
          autoCashout,
          cashedOutAt,
          outcome: 'won',
          payout: cashedOutAt,
          returned: returned.toString(),
        };
      }
      return { amount: bet.amount, autoCashout, cashedOutAt: null, outcome: 'lost', payout: 0, returned: '0' };
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
 * Stateful per-round bet collector. Mirrors a live panel where one or two bets
 * (each with an optional auto cash-out) are placed, undone, repeated and
 * doubled before the round starts. Pure data; the engine consumes the list.
 */
export class BetManager {
  private bets: CrashBet[] = [];
  private lastRound: CrashBet[] = [];

  place(bet: CrashBet): void {
    this.bets.push(bet);
  }

  undo(): CrashBet | undefined {
    return this.bets.pop();
  }

  clear(): void {
    this.bets = [];
  }

  /** Re-place the bets from the previous round. */
  repeat(): void {
    this.bets = this.lastRound.map((b) => ({ ...b }));
  }

  /** Double every staked chip currently placed. */
  double(): void {
    this.bets = this.bets.map((b) => ({ ...b, amount: (Number(b.amount) * 2).toString() }));
  }

  total(): number {
    return this.bets.reduce((sum, b) => sum + Number(b.amount), 0);
  }

  list(): CrashBet[] {
    return [...this.bets];
  }

  /** Snapshot the current bets as the repeatable "last round" and reset. */
  commit(): CrashBet[] {
    this.lastRound = this.bets.map((b) => ({ ...b }));
    const committed = this.list();
    this.clear();
    return committed;
  }
}
