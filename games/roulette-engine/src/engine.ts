import {
  BetValidator,
  PayoutCalculator,
  ResultEvaluator,
  type RouletteBet,
  type RouletteSettlement,
} from './bets';
import { ProvablyFairWheel } from './provably-fair';
import type { RouletteColor, RouletteRuleSet } from './rules';
import { Wheel } from './wheel';

export interface RouletteRoundResult {
  roundId: string;
  variant: string;
  mode: 'roulette';
  /** Winning pocket number (`37` ⇒ `00`). */
  pocket: number;
  pocketLabel: string;
  color: RouletteColor;
  /** Ball landing slot on the physical ring. */
  sequenceIndex: number;
  /** Full visual rotation (degrees) for the spin animation. */
  rotation: number;
  /** Distinct bet-type keys that won this round. */
  winningBets: string[];
  settlement: RouletteSettlement;
  details: Record<string, unknown>;
  verification: { seed: string; serverSeedHash?: string; clientSeed?: string; nonce?: number };
}

/**
 * The authoritative roulette round engine. Constructed with a resolved ruleset
 * and a provably-fair seed, it produces a deterministic, fully-settled spin. The
 * same seed always lands on the same pocket — enabling replay and verification.
 *
 * Fully data-driven: the wheel, bet board, payouts and house rules all come from
 * the ruleset; there are no per-variant branches.
 */
export class RouletteEngine {
  private readonly wheel: Wheel;

  constructor(
    readonly ruleset: RouletteRuleSet,
    private readonly seed: string,
  ) {
    this.wheel = new Wheel(ruleset.layout);
  }

  get wheelRing(): Wheel {
    return this.wheel;
  }

  /** Spin the wheel and settle all bets in one deterministic step. */
  spin(roundId: string, bets: RouletteBet[], turns = 5): RouletteRoundResult {
    BetValidator.validate(this.ruleset, bets);

    const { index, pocket } = ProvablyFairWheel.spin(this.seed, this.ruleset.layout);
    const landing = this.wheel.at(index);
    const settlement = PayoutCalculator.settle(this.ruleset, bets, pocket);
    const winningBets = [
      ...new Set(settlement.bets.filter((b) => b.outcome === 'won').map((b) => b.type)),
    ];

    return {
      roundId,
      variant: this.ruleset.key,
      mode: 'roulette',
      pocket,
      pocketLabel: landing.label,
      color: landing.color,
      sequenceIndex: index,
      rotation: turns * 360 + landing.angle,
      winningBets,
      settlement,
      details: ResultEvaluator.describe(this.ruleset.layout, pocket),
      verification: { seed: this.seed },
    };
  }
}
