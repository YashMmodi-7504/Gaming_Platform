import { BetSlipManager, BetValidator, type QuoteInput, type SlipQuote } from './betslip';
import { SettlementManager, type SlipSettlement } from './settlement';
import type { SportsRuleSet } from './rules';
import type { BetSlip, Match, SelectionStatus } from './types';

export interface PlacedSlip {
  slip: BetSlip;
}

/**
 * The authoritative sportsbook engine. Constructed with a resolved rule profile,
 * it prices and validates bet slips and settles them against match results. It
 * is fully data-driven: markets, odds and results come from the catalog; there
 * is no per-sport or per-market branching.
 */
export class SportsEngine {
  constructor(readonly ruleset: SportsRuleSet) {}

  /** Price a slip without persisting it. */
  quote(input: QuoteInput): SlipQuote {
    return BetSlipManager.quote(input);
  }

  /** Validate and build a slip ready to persist. Throws on rule violations. */
  place(input: QuoteInput & { userId?: string; at: number }): BetSlip {
    BetValidator.validate(this.ruleset, input);
    const slip = BetSlipManager.build(input);
    if (Number(slip.potentialReturn) > this.ruleset.maxPayout) {
      // Defensive: build re-checks payout cap consistency.
      slip.potentialReturn = this.ruleset.maxPayout.toString();
    }
    return slip;
  }

  /**
   * Settle a slip against the relevant matches. Each leg's status is derived from
   * its match result; the slip status and return are computed from the legs.
   */
  settle(slip: BetSlip, matches: Map<string, Match>): SlipSettlement {
    const statuses = new Map<string, SelectionStatus>();
    for (const leg of slip.selections) {
      const match = matches.get(leg.matchId);
      if (!match || !match.result) {
        statuses.set(leg.selectionId, leg.status ?? 'pending');
        continue;
      }
      const market = match.markets.find((m) => m.id === leg.marketId);
      const selection = market?.selections.find((s) => s.id === leg.selectionId);
      if (!market || !selection) {
        statuses.set(leg.selectionId, 'void');
        continue;
      }
      statuses.set(leg.selectionId, SettlementManager.settleSelection(market, selection, match.result));
    }
    return SettlementManager.settleSlip(slip, statuses);
  }
}
