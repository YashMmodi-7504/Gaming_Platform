import {
  BaseGamePlugin,
  GameGenre,
  type GameConfig,
  type GameEvent,
  type GamePluginMetadata,
  type PluginRegistration,
} from '@gaming-platform/game-sdk';

export interface SportsConfig extends GameConfig {
  maxSelections: number;
}

export type SelectionResult = 'won' | 'lost' | 'void' | 'pending';

export interface SportsSelection {
  marketId: string;
  selectionId: string;
  /** Decimal odds (e.g. 2.5). */
  odds: number;
}

export interface SportsBet {
  betId: string;
  amount: string;
  type: 'single' | 'accumulator';
  selections: SportsSelection[];
}

export interface SportsState {
  openBets: SportsBet[];
  settledCount: number;
}

export interface SettlementOutcome {
  status: 'won' | 'lost' | 'void';
  multiplier: number;
}

/** Settle a (possibly multi-leg) bet against a result map. Decimal-odds math. */
export function settleBet(
  bet: SportsBet,
  results: Record<string, SelectionResult>,
): SettlementOutcome {
  let combined = 1;
  let anyLost = false;
  let allVoid = true;

  for (const selection of bet.selections) {
    const result = results[selection.selectionId] ?? 'pending';
    if (result === 'lost') {
      anyLost = true;
    } else if (result === 'won') {
      combined *= selection.odds;
      allVoid = false;
    }
  }

  if (anyLost) return { status: 'lost', multiplier: 0 };
  if (allVoid) return { status: 'void', multiplier: 1 };
  return { status: 'won', multiplier: Math.round(combined * 100) / 100 };
}

export const SPORTS_DEFAULT_CONFIG: SportsConfig = { maxSelections: 12 };

export const sportsMetadata: GamePluginMetadata = {
  key: 'sports-engine',
  name: 'Sports Engine',
  genre: GameGenre.SPORTS,
  version: '2.0.0',
  minPlayers: 1,
  maxPlayers: 1,
  capabilities: ['decimal-odds', 'accumulator', 'settlement', 'data-driven', 'multi-sport'],
  defaultConfig: SPORTS_DEFAULT_CONFIG,
};

/**
 * Reusable sports-betting genre plugin: place single/accumulator bets and settle
 * them against an external results feed using decimal-odds math. The full
 * data-driven catalog, markets and settlement live in the engine modules and the
 * backend sports module.
 */
export class SportsPlugin extends BaseGamePlugin<SportsConfig, SportsState> {
  readonly metadata = sportsMetadata;

  createInitialState(): SportsState {
    return { openBets: [], settledCount: 0 };
  }

  protected onStart(): void {
    this.emitEvent('sports:ready', { config: this.config });
  }

  protected onEvent(event: GameEvent): void {
    if (event.type === 'sports:place') {
      this.placeBet(event.payload as SportsBet);
    } else if (event.type === 'sports:settle') {
      this.settle((event.payload as { results?: Record<string, SelectionResult> }).results ?? {});
    }
  }

  private placeBet(bet: SportsBet): void {
    if (bet.selections.length === 0 || bet.selections.length > this.config.maxSelections) {
      this.emitEvent('sports:rejected', { betId: bet.betId, reason: 'invalid_selection_count' });
      return;
    }
    this.host.state.update((draft) => {
      draft.openBets = [...draft.openBets, bet];
    });
    this.host.statistics.increment('bets_placed');
    this.emitEvent('sports:placed', { betId: bet.betId });
  }

  private settle(results: Record<string, SelectionResult>): void {
    const open = this.state.openBets;
    const remaining: SportsBet[] = [];

    for (const bet of open) {
      const allResolved = bet.selections.every(
        (s) => (results[s.selectionId] ?? 'pending') !== 'pending',
      );
      if (!allResolved) {
        remaining.push(bet);
        continue;
      }
      const outcome = settleBet(bet, results);
      const winAmount = (Number(bet.amount) * outcome.multiplier).toString();
      const result = this.host.results.record({
        roundId: bet.betId,
        outcome: outcome.status.toUpperCase(),
        betAmount: bet.amount,
        winAmount,
        multiplier: outcome.multiplier,
        payload: { selections: bet.selections, status: outcome.status },
      });
      this.host.statistics.increment('bets_settled');
      this.emitEvent('sports:settled', { betId: bet.betId, outcome, winAmount, result });
    }

    this.host.state.update((draft) => {
      draft.openBets = remaining;
      draft.settledCount += open.length - remaining.length;
    });
  }
}

export const createSportsPlugin = (): SportsPlugin => new SportsPlugin();

export const sportsRegistration: PluginRegistration = {
  metadata: sportsMetadata,
  factory: createSportsPlugin,
};
