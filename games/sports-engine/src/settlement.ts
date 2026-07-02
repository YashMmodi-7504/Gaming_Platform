import { OddsManager } from './odds';
import type { BetSlip, Market, MatchResult, Selection, SelectionStatus } from './types';

export interface SelectionSettlement {
  selectionId: string;
  status: SelectionStatus;
}

export interface SlipSettlement {
  betId: string;
  status: SelectionStatus;
  /** Effective combined odds after voids (void legs collapse to odds 1). */
  combinedOdds: number;
  returned: string;
  selections: Array<{ selectionId: string; status: SelectionStatus }>;
}

/**
 * Settles selections and slips against a match result feed. Behaviour is driven
 * entirely by the market's settlement mode and the result data — there is no
 * per-market or per-sport branching.
 */
export const SettlementManager = {
  /**
   * Settle a single selection inside a market against its match result.
   * `outright`: selection wins if its id is among the market's declared winners.
   * `line`: the realised numeric value is compared to the selection's line/side
   * (with a push → void when the value equals the line).
   */
  settleSelection(market: Market, selection: Selection, result: MatchResult): SelectionStatus {
    if (result.voids.includes(selection.id)) return 'void';

    if (market.settlement === 'line') {
      const value = result.lines[market.id];
      if (value === undefined) return 'pending';
      const line = selection.line ?? market.line ?? 0;
      if (value === line) return 'void'; // exact line is a push
      const isOver = selection.side === 'over';
      const isUnder = selection.side === 'under';
      if (isOver) return value > line ? 'won' : 'lost';
      if (isUnder) return value < line ? 'won' : 'lost';
      // Handicap home/away: value is (home − away) margin already adjusted upstream.
      if (selection.side === 'home') return value + line > 0 ? 'won' : 'lost';
      if (selection.side === 'away') return value + line < 0 ? 'won' : 'lost';
      return 'pending';
    }

    // Outright.
    const winners = result.winners[market.id];
    if (winners === undefined) return 'pending';
    return winners.includes(selection.id) ? 'won' : 'lost';
  },

  /** Settle every selection in a market in-place, returning the statuses. */
  settleMarket(market: Market, result: MatchResult): SelectionSettlement[] {
    return market.selections.map((selection) => {
      const status = SettlementManager.settleSelection(market, selection, result);
      selection.status = status;
      return { selectionId: selection.id, status };
    });
  },

  /**
   * Settle a bet slip. A slip is `lost` if any leg lost; `pending` if any leg is
   * still pending; otherwise `won` (won/void legs only), with void legs
   * collapsing their odds to 1 so the player is refunded that leg's contribution.
   */
  settleSlip(slip: BetSlip, statuses: Map<string, SelectionStatus>): SlipSettlement {
    let anyLost = false;
    let anyPending = false;
    let combined = 1;

    const legs = slip.selections.map((leg) => {
      const status = statuses.get(leg.selectionId) ?? leg.status ?? 'pending';
      if (status === 'lost') anyLost = true;
      else if (status === 'pending' || status === 'open') anyPending = true;
      else if (status === 'won') combined *= leg.odds;
      // 'void' contributes odds 1 (refund that leg).
      return { selectionId: leg.selectionId, status };
    });

    let status: SelectionStatus;
    if (anyLost) status = 'lost';
    else if (anyPending) status = 'pending';
    else if (legs.every((l) => l.status === 'void')) status = 'void';
    else status = 'won';

    const combinedOdds = status === 'won' ? OddsManager.combine([combined]) : status === 'void' ? 1 : 0;
    const stake = Number(slip.stake);
    const returned =
      status === 'won'
        ? OddsManager.payout(stake, combinedOdds)
        : status === 'void'
          ? stake
          : 0;

    return {
      betId: slip.betId,
      status,
      combinedOdds,
      returned: returned.toString(),
      selections: legs,
    };
  },

  /** Map a match result to a flat selectionId → status map for all its markets. */
  resultStatuses(markets: Market[], result: MatchResult): Map<string, SelectionStatus> {
    const map = new Map<string, SelectionStatus>();
    for (const market of markets) {
      for (const selection of market.selections) {
        map.set(selection.id, SettlementManager.settleSelection(market, selection, result));
      }
    }
    return map;
  },
};

/** Legacy selection-result mapping retained for backward compatibility. */
export function resultToStatus(value: 'won' | 'lost' | 'void' | 'pending'): SelectionStatus {
  return value;
}
