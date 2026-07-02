import {
  BetValidator,
  PayoutCalculator,
  ResultEvaluator,
  type DiceBet,
  type DiceSettlement,
} from './bets';
import { DiceSerializer, type DiceSet } from './dice';
import { ProvablyFairDiceRoller, RollManager } from './provably-fair';
import type { DiceGameRuleSet } from './rules';

export interface DiceRoundResult {
  roundId: string;
  variant: string;
  mode: 'dice';
  /** Rolled face values in order. */
  values: number[];
  total: number;
  isTriple: boolean;
  /** Per-die spin counts for deterministic animation. */
  spins: number[];
  /** Distinct bet-type keys that won this round. */
  winningBets: string[];
  settlement: DiceSettlement;
  details: Record<string, unknown>;
  verification: { seed: string; serverSeedHash?: string; clientSeed?: string; nonce?: number };
}

/**
 * The authoritative dice round engine. Constructed with a resolved ruleset and a
 * provably-fair seed, it produces a deterministic, fully-settled roll. The same
 * seed always yields the same dice — enabling replay and verification.
 *
 * Fully data-driven: dice count, faces, the bet board, payouts and house rules
 * all come from the ruleset; there are no per-variant branches.
 */
export class DiceEngine {
  private readonly roller: RollManager;

  constructor(
    readonly ruleset: DiceGameRuleSet,
    private readonly seed: string,
  ) {
    this.roller = new RollManager(ruleset.diceCount, ruleset.faces);
  }

  /** Roll the dice (no settlement) — used for verification feeds. */
  rollOnly(): DiceSet {
    return ProvablyFairDiceRoller.roll(this.seed, this.ruleset.diceCount, this.ruleset.faces);
  }

  /** Roll the dice and settle all bets in one deterministic step. */
  roll(roundId: string, bets: DiceBet[]): DiceRoundResult {
    BetValidator.validate(this.ruleset, bets);

    const { set, spins } = this.roller.rollWithSpins(this.seed);
    const settlement = PayoutCalculator.settle(this.ruleset, bets, set);
    const winningBets = [
      ...new Set(settlement.bets.filter((b) => b.outcome === 'won').map((b) => b.type)),
    ];

    return {
      roundId,
      variant: this.ruleset.key,
      mode: 'dice',
      values: DiceSerializer.encode(set),
      total: set.total(),
      isTriple: set.isTriple(),
      spins,
      winningBets,
      settlement,
      details: ResultEvaluator.describe(this.ruleset, set),
      verification: { seed: this.seed },
    };
  }
}
