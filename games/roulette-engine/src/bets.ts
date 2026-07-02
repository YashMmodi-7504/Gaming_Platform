import { RuleResolver, RuleValidationError, type BetTypeDefinition, type RouletteRuleSet, type WheelLayout } from './rules';

export interface RouletteBet {
  /** Bet type key from the ruleset (e.g. `straight`, `red`, `dozen`). */
  type: string;
  amount: string;
  /**
   * Covered numbers for `numbers` bets, or a single group index for
   * `dozen`/`column`. Ignored for simple even-money bets.
   */
  selection?: number[];
}

export interface BetSettlement {
  type: string;
  amount: string;
  selection: number[];
  outcome: 'won' | 'lost' | 'push';
  payout: number;
  returned: string;
}

export interface RouletteSettlement {
  bets: BetSettlement[];
  totalBet: string;
  totalWin: string;
  net: string;
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to; n += 1) out.push(n);
  return out;
}

/**
 * Computes which pocket numbers a bet covers, and evaluates outcomes against a
 * winning pocket. Entirely driven by the wheel layout + bet definition — no
 * per-variant branches.
 */
export const ResultEvaluator = {
  /** The set of pocket numbers a bet covers. */
  coveredNumbers(layout: WheelLayout, def: BetTypeDefinition, selection: number[] = []): number[] {
    const all = range(1, layout.maxNumber);
    switch (def.match) {
      case 'numbers':
        return selection;
      case 'red':
        return layout.redNumbers;
      case 'black':
        return all.filter((n) => !layout.redNumbers.includes(n));
      case 'odd':
        return all.filter((n) => n % 2 === 1);
      case 'even':
        return all.filter((n) => n % 2 === 0);
      case 'low':
        return range(layout.lowRange[0], layout.lowRange[1]);
      case 'high':
        return range(layout.highRange[0], layout.highRange[1]);
      case 'dozen': {
        const dozen = selection[0] ?? 1;
        const start = (dozen - 1) * layout.dozenSize + 1;
        return range(start, start + layout.dozenSize - 1).filter((n) => n <= layout.maxNumber);
      }
      case 'column': {
        const column = selection[0] ?? 1;
        return all.filter((n) => ((n - 1) % layout.columnStride) + 1 === column);
      }
      default:
        return [];
    }
  },

  /** Does the bet win against the winning pocket? */
  wins(layout: WheelLayout, def: BetTypeDefinition, selection: number[], pocket: number): boolean {
    return ResultEvaluator.coveredNumbers(layout, def, selection).includes(pocket);
  },

  /** Describe the outside-bet categories a pocket satisfies (for stats/UI). */
  describe(layout: WheelLayout, pocket: number): Record<string, unknown> {
    const isGreen = layout.greenPockets.includes(pocket);
    return {
      pocket,
      green: isGreen,
      color: isGreen ? 'green' : layout.redNumbers.includes(pocket) ? 'red' : 'black',
      parity: isGreen ? 'none' : pocket % 2 === 0 ? 'even' : 'odd',
      range:
        isGreen ? 'none' : pocket <= layout.lowRange[1] ? 'low' : 'high',
      dozen: isGreen ? 0 : Math.floor((pocket - 1) / layout.dozenSize) + 1,
      column: isGreen ? 0 : ((pocket - 1) % layout.columnStride) + 1,
    };
  },
};

/** Validates placed bets against the ruleset's bet types and table limits. */
export const BetValidator = {
  validate(ruleset: RouletteRuleSet, bets: RouletteBet[]): RouletteBet[] {
    if (bets.length === 0) throw new RuleValidationError('At least one bet is required');
    const { min, max, tableMax } = ruleset.limits;
    let total = 0;

    for (const bet of bets) {
      const def = RuleResolver.betType(ruleset, bet.type);
      if (!def) throw new RuleValidationError(`Bet "${bet.type}" is not allowed for ${ruleset.key}`);

      const amount = Number(bet.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        throw new RuleValidationError(`Bet "${bet.type}" amount must be a positive number`);
      }
      if (amount < min || amount > max) {
        throw new RuleValidationError(`Bet "${bet.type}" must be between ${min} and ${max}`);
      }
      total += amount;

      const selection = bet.selection ?? [];
      if (def.match === 'numbers') {
        if (selection.length !== def.selectionSize) {
          throw new RuleValidationError(
            `Bet "${bet.type}" requires ${def.selectionSize} numbers, got ${selection.length}`,
          );
        }
        for (const n of selection) {
          const onWheel = ruleset.layout.sequence.includes(n);
          if (!onWheel) {
            throw new RuleValidationError(`Number ${n} is not on the ${ruleset.key} wheel`);
          }
        }
      }
      if (def.match === 'dozen') {
        const maxDozen = Math.ceil(ruleset.layout.maxNumber / ruleset.layout.dozenSize);
        const dozen = selection[0] ?? 1;
        if (dozen < 1 || dozen > maxDozen) {
          throw new RuleValidationError(`Dozen index must be between 1 and ${maxDozen}`);
        }
      }
      if (def.match === 'column') {
        const column = selection[0] ?? 1;
        if (column < 1 || column > ruleset.layout.columnStride) {
          throw new RuleValidationError(`Column index must be between 1 and ${ruleset.layout.columnStride}`);
        }
      }
    }

    if (total > tableMax) {
      throw new RuleValidationError(`Total stake ${total} exceeds table maximum ${tableMax}`);
    }
    return bets;
  },
};

/**
 * Settles every placed bet against the winning pocket, applying La Partage /
 * En Prison half-back on even-money outside bets when the ball lands on green.
 */
export const PayoutCalculator = {
  settle(ruleset: RouletteRuleSet, bets: RouletteBet[], pocket: number): RouletteSettlement {
    const { layout, houseRules } = ruleset;
    const isGreen = layout.greenPockets.includes(pocket);
    const halfBack = houseRules.laPartage || houseRules.enPrison;
    let totalBet = 0;
    let totalWin = 0;

    const settled: BetSettlement[] = bets.map((bet) => {
      const amount = Number(bet.amount);
      const selection = bet.selection ?? [];
      totalBet += amount;
      const def = RuleResolver.betType(ruleset, bet.type)!;
      const won = ResultEvaluator.wins(layout, def, selection, pocket);

      if (won) {
        const returned = amount * def.payout;
        totalWin += returned;
        return { type: bet.type, amount: bet.amount, selection, outcome: 'won', payout: def.payout, returned: returned.toString() };
      }

      const evenMoney = def.category === 'outside' && def.payout === 2;
      if (isGreen && halfBack && evenMoney) {
        const returned = amount * 0.5;
        totalWin += returned;
        return { type: bet.type, amount: bet.amount, selection, outcome: 'push', payout: 0.5, returned: returned.toString() };
      }

      return { type: bet.type, amount: bet.amount, selection, outcome: 'lost', payout: 0, returned: '0' };
    });

    return {
      bets: settled,
      totalBet: totalBet.toString(),
      totalWin: totalWin.toString(),
      net: (totalWin - totalBet).toString(),
    };
  },
};

/** Alias kept parallel to the card engine's `ResultCalculator` naming. */
export const ResultCalculator = PayoutCalculator;

/**
 * Stateful per-round bet collector. Mirrors a live table where chips are added,
 * undone, repeated, and doubled before the spin. Pure data; the engine consumes
 * the assembled list.
 */
export class BetManager {
  private bets: RouletteBet[] = [];
  private lastRound: RouletteBet[] = [];

  place(bet: RouletteBet): void {
    this.bets.push(bet);
  }

  /** Undo the most recently placed chip. */
  undo(): RouletteBet | undefined {
    return this.bets.pop();
  }

  clear(): void {
    this.bets = [];
  }

  /** Re-place the bets from the previous settled round. */
  repeat(): void {
    this.bets = this.lastRound.map((b) => ({ ...b, selection: b.selection ? [...b.selection] : undefined }));
  }

  /** Double every staked chip currently on the table. */
  double(): void {
    this.bets = this.bets.map((b) => ({ ...b, amount: (Number(b.amount) * 2).toString() }));
  }

  total(): number {
    return this.bets.reduce((sum, b) => sum + Number(b.amount), 0);
  }

  list(): RouletteBet[] {
    return [...this.bets];
  }

  /** Snapshot the current bets as the repeatable "last round" and reset. */
  commit(): RouletteBet[] {
    this.lastRound = this.bets.map((b) => ({ ...b, selection: b.selection ? [...b.selection] : undefined }));
    const committed = this.list();
    this.clear();
    return committed;
  }
}
