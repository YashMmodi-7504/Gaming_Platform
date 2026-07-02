import {
  BaseGamePlugin,
  GameGenre,
  type GameConfig,
  type GameEvent,
  type GamePluginMetadata,
  type PluginRegistration,
} from '@gaming-platform/game-sdk';

import { CardEngine, type CardRoundResult } from './engine';
import { HistoryRecorder, type RoundHistoryEntry } from './recording';
import type { CardGameRuleSet } from './rules';
import { DEFAULT_CARD_VARIANT, VariantResolver } from './presets';
import type { PlacedBet } from './betting';

export interface CardEngineConfig extends GameConfig {
  variant: string;
  ruleOverrides?: Partial<CardGameRuleSet>;
}

export interface CardEngineState {
  variant: string;
  ruleName: string;
  phase: 'ready' | 'awaiting-action' | 'settled';
  round: number;
  lastResult: CardRoundResult | null;
  bjPlayer: string[];
  bjDealerUp: string[];
  history: RoundHistoryEntry[];
}

export const CARD_DEFAULT_CONFIG: CardEngineConfig = {
  variant: DEFAULT_CARD_VARIANT,
  decks: 1,
};

export const cardMetadata: GamePluginMetadata = {
  key: 'card-engine',
  name: 'Card Engine',
  genre: GameGenre.CARD,
  version: '2.0.0',
  minPlayers: 1,
  maxPlayers: 8,
  capabilities: ['provably-fair', 'data-driven', 'multi-variant', 'replay', 'multi-player'],
  defaultConfig: CARD_DEFAULT_CONFIG,
};

/**
 * The data-driven Card Engine plugin. A single plugin powers every supported
 * card game; the active game is chosen by the `variant` config and resolved into
 * a ruleset. Each round runs on a deterministic, provably-fair shoe.
 */
export class CardEnginePlugin extends BaseGamePlugin<CardEngineConfig, CardEngineState> {
  readonly metadata = cardMetadata;

  private ruleset!: CardGameRuleSet;
  private readonly resolver = new VariantResolver();
  private readonly history = new HistoryRecorder(50);
  private interactive: CardEngine | null = null;

  createInitialState(): CardEngineState {
    return {
      variant: DEFAULT_CARD_VARIANT,
      ruleName: '',
      phase: 'ready',
      round: 0,
      lastResult: null,
      bjPlayer: [],
      bjDealerUp: [],
      history: [],
    };
  }

  protected onConfigure(): void {
    const variant = this.config.variant ?? DEFAULT_CARD_VARIANT;
    this.ruleset = this.resolver.resolve(variant, this.config.ruleOverrides);
    this.host.state.update((draft) => {
      draft.variant = this.ruleset.key;
      draft.ruleName = this.ruleset.name;
    });
  }

  protected onStart(): void {
    this.emitEvent('card:ready', {
      variant: this.ruleset.key,
      name: this.ruleset.name,
      mode: this.ruleset.evaluationMode,
      sides: this.ruleset.sides,
      bets: this.ruleset.bets,
      sideBets: this.ruleset.sideBets,
      betLimits: this.ruleset.betLimits,
      interactive: this.ruleset.interactive,
    });
  }

  protected onEvent(event: GameEvent): void {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    switch (event.type) {
      case 'card:play':
        this.handlePlay((payload.bets as PlacedBet[]) ?? this.defaultBets());
        break;
      case 'card:deal':
        // Harness compatibility — runs a demo round with a token bet.
        this.handlePlay(this.defaultBets());
        break;
      case 'card:shuffle':
        this.emitEvent('card:shuffled', { variant: this.ruleset.key });
        break;
      case 'card:bj-deal':
        this.handleBlackjackDeal((payload.bets as PlacedBet[]) ?? this.defaultBets());
        break;
      case 'card:bj-hit':
        this.handleBlackjackHit();
        break;
      case 'card:bj-stand':
        this.handleBlackjackResolve();
        break;
      default:
        break;
    }
  }

  // ---- Auto-resolve rounds -------------------------------------------------

  private handlePlay(bets: PlacedBet[]): void {
    const round = this.state.round + 1;
    const engine = this.engineForRound(round);
    const roundId = `${this.host.context.sessionId}:${round}`;
    const result = engine.playRound(roundId, bets);
    this.commitResult(round, result);
  }

  // ---- Interactive blackjack ----------------------------------------------

  private handleBlackjackDeal(bets: PlacedBet[]): void {
    const round = this.state.round + 1;
    this.interactive = this.engineForRound(round);
    const roundId = `${this.host.context.sessionId}:${round}`;
    const deal = this.interactive.dealBlackjack(roundId, bets);
    this.host.state.update((draft) => {
      draft.phase = 'awaiting-action';
      draft.round = round;
      draft.bjPlayer = deal.player;
      draft.bjDealerUp = deal.dealerUp;
    });
    this.emitEvent('card:bj-dealt', deal);
  }

  private handleBlackjackHit(): void {
    if (!this.interactive) return;
    const hit = this.interactive.blackjackHit();
    this.host.state.update((draft) => {
      draft.bjPlayer = hit.player;
    });
    this.emitEvent('card:bj-hit', hit);
    if (hit.busted) this.handleBlackjackResolve();
  }

  private handleBlackjackResolve(): void {
    if (!this.interactive) return;
    const result = this.interactive.blackjackResolve();
    this.interactive = null;
    this.commitResult(this.state.round, result);
  }

  // ---- Shared result commit ------------------------------------------------

  private commitResult(round: number, result: CardRoundResult): void {
    const entry: RoundHistoryEntry = {
      roundId: result.roundId,
      variant: result.variant,
      winners: result.winners,
      totalBet: result.settlement.totalBet,
      totalWin: result.settlement.totalWin,
      at: Date.now(),
    };
    this.history.record(entry);

    this.host.results.record({
      roundId: result.roundId,
      outcome: result.winners.join('/') || 'none',
      betAmount: result.settlement.totalBet,
      winAmount: result.settlement.totalWin,
      multiplier:
        Number(result.settlement.totalBet) > 0
          ? Number(result.settlement.totalWin) / Number(result.settlement.totalBet)
          : 0,
      payload: { hands: result.hands, community: result.community, mode: result.mode },
    });
    this.host.statistics.increment('rounds');
    for (const side of result.winners) this.host.statistics.increment(`win:${side}`);
    this.host.replay.record('card:round', { roundId: result.roundId, winners: result.winners });

    this.host.state.update((draft) => {
      draft.phase = 'settled';
      draft.round = round;
      draft.lastResult = result;
      draft.history = [entry, ...draft.history].slice(0, 20);
      draft.bjPlayer = [];
      draft.bjDealerUp = [];
    });

    this.emitEvent('card:result', result);
  }

  private engineForRound(round: number): CardEngine {
    return new CardEngine(this.ruleset, `${this.host.context.seed}:${round}`);
  }

  private defaultBets(): PlacedBet[] {
    const first = this.ruleset.bets[0];
    return first ? [{ key: first.key, amount: '1' }] : [];
  }
}

export const createCardPlugin = (): CardEnginePlugin => new CardEnginePlugin();

export const cardRegistration: PluginRegistration = {
  metadata: cardMetadata,
  factory: createCardPlugin,
};
