import { OddsManager } from './odds';
import { RuleValidationError, type SportsRuleSet } from './rules';
import type { BetSelection, BetSlip, BetType } from './types';

let counter = 0;
/** Deterministic-ish unique id without Date/Math.random (cross-runtime safe). */
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${(counter * 2654435761) % 0xffffffff}`;
}

export interface QuoteInput {
  type: BetType;
  stake: string;
  selections: BetSelection[];
}

export interface SlipQuote {
  type: BetType;
  combinedOdds: number;
  stake: string;
  potentialReturn: string;
  legCount: number;
}

/**
 * Builds and prices bet slips. A single bet has one leg; an accumulator multiplies
 * the leg odds. Pure data — the backend persists the resulting slip.
 */
export const BetSlipManager = {
  /** Price a slip without persisting it. */
  quote(input: QuoteInput): SlipQuote {
    const odds = input.selections.map((s) => s.odds);
    const combinedOdds =
      input.type === 'single' ? (odds[0] ?? 0) : OddsManager.combine(odds);
    const stake = Number(input.stake);
    return {
      type: input.type,
      combinedOdds,
      stake: input.stake,
      potentialReturn: OddsManager.payout(stake, combinedOdds).toString(),
      legCount: input.selections.length,
    };
  },

  /** Assemble a complete slip (id, prices, status) ready for validation/persist. */
  build(input: QuoteInput & { userId?: string; at: number }): BetSlip {
    const quote = BetSlipManager.quote(input);
    return {
      betId: nextId('bet'),
      userId: input.userId,
      type: input.type,
      stake: input.stake,
      selections: input.selections.map((s) => ({ ...s, status: 'pending' })),
      combinedOdds: quote.combinedOdds,
      potentialReturn: quote.potentialReturn,
      status: 'pending',
      createdAt: input.at,
    };
  },
};

/**
 * Validates a slip against a sportsbook rule profile: stake limits, leg count,
 * per-leg odds bounds, payout cap, duplicate-market protection and bet-type
 * availability.
 */
export const BetValidator = {
  validate(ruleset: SportsRuleSet, input: QuoteInput): void {
    const legs = input.selections;
    if (legs.length === 0) throw new RuleValidationError('A bet requires at least one selection');

    if (input.type === 'single' && legs.length !== 1) {
      throw new RuleValidationError('A single bet must have exactly one selection');
    }
    if (input.type === 'accumulator' && !ruleset.allowAccumulator) {
      throw new RuleValidationError('Accumulators are not allowed on this profile');
    }
    if (input.type === 'system' && !ruleset.allowSystem) {
      throw new RuleValidationError('System bets are not allowed on this profile');
    }
    if (legs.length > ruleset.maxSelections) {
      throw new RuleValidationError(`At most ${ruleset.maxSelections} selections are allowed`);
    }

    const stake = Number(input.stake);
    if (Number.isNaN(stake) || stake <= 0) {
      throw new RuleValidationError('Stake must be a positive number');
    }
    if (stake < ruleset.minStake || stake > ruleset.maxStake) {
      throw new RuleValidationError(`Stake must be between ${ruleset.minStake} and ${ruleset.maxStake}`);
    }

    const seenMarkets = new Set<string>();
    for (const leg of legs) {
      if (leg.odds < ruleset.minOdds || leg.odds > ruleset.maxOdds) {
        throw new RuleValidationError(`Odds ${leg.odds} are outside ${ruleset.minOdds}-${ruleset.maxOdds}`);
      }
      // Two legs from the same market cannot combine in an accumulator.
      if (input.type !== 'single' && seenMarkets.has(leg.marketId)) {
        throw new RuleValidationError('Cannot combine selections from the same market');
      }
      seenMarkets.add(leg.marketId);
    }

    const quote = BetSlipManager.quote(input);
    if (Number(quote.potentialReturn) > ruleset.maxPayout) {
      throw new RuleValidationError(`Potential return exceeds the ${ruleset.maxPayout} cap`);
    }
  },
};
