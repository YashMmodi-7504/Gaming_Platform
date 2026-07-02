import {
  BaseGamePlugin,
  GameGenre,
  type GameConfig,
  type GameEvent,
  type GamePluginMetadata,
  type PluginRegistration,
} from '@gaming-platform/game-sdk';

import { RouletteEngine, type RouletteRoundResult } from './engine';
import { DEFAULT_ROULETTE_VARIANT, VariantResolver } from './presets';
import { HistoryRecorder, type RoundHistoryEntry } from './recording';
import type { RouletteColor, RouletteRuleSet } from './rules';
import type { RouletteBet } from './bets';

export interface RouletteEngineConfig extends GameConfig {
  variant: string;
  ruleOverrides?: Partial<RouletteRuleSet>;
}

export interface RouletteEngineState {
  variant: string;
  ruleName: string;
  phase: 'ready' | 'settled';
  round: number;
  lastPocket: number | null;
  lastColor: RouletteColor | null;
  lastResult: RouletteRoundResult | null;
  history: RoundHistoryEntry[];
}

/** Raw bet shape accepted from clients (supports legacy `value` single-number). */
interface IncomingBet {
  type: string;
  amount: string;
  value?: number;
  selection?: number[];
}

export const ROULETTE_DEFAULT_CONFIG: RouletteEngineConfig = {
  variant: DEFAULT_ROULETTE_VARIANT,
};

export const rouletteMetadata: GamePluginMetadata = {
  key: 'roulette-engine',
  name: 'Roulette Engine',
  genre: GameGenre.ROULETTE,
  version: '2.0.0',
  minPlayers: 1,
  maxPlayers: 8,
  capabilities: ['provably-fair', 'data-driven', 'multi-variant', 'replay', 'table'],
  defaultConfig: ROULETTE_DEFAULT_CONFIG,
};

/**
 * The data-driven Roulette Engine plugin. A single plugin powers every roulette
 * variant; the active table is chosen by the `variant` config and resolved into
 * a ruleset. Each spin runs on a deterministic, provably-fair seed.
 */
export class RoulettePlugin extends BaseGamePlugin<RouletteEngineConfig, RouletteEngineState> {
  readonly metadata = rouletteMetadata;

  private ruleset!: RouletteRuleSet;
  private readonly resolver = new VariantResolver();
  private readonly history = new HistoryRecorder(50);

  createInitialState(): RouletteEngineState {
    return {
      variant: DEFAULT_ROULETTE_VARIANT,
      ruleName: '',
      phase: 'ready',
      round: 0,
      lastPocket: null,
      lastColor: null,
      lastResult: null,
      history: [],
    };
  }

  protected onConfigure(): void {
    const variant = this.config.variant ?? DEFAULT_ROULETTE_VARIANT;
    this.ruleset = this.resolver.resolve(variant, this.config.ruleOverrides);
    this.host.state.update((draft) => {
      draft.variant = this.ruleset.key;
      draft.ruleName = this.ruleset.name;
    });
  }

  protected onStart(): void {
    this.emitEvent('roulette:ready', {
      variant: this.ruleset.key,
      name: this.ruleset.name,
      betTypes: this.ruleset.betTypes,
      limits: this.ruleset.limits,
      houseRules: this.ruleset.houseRules,
      sequence: this.ruleset.layout.sequence,
    });
  }

  protected onEvent(event: GameEvent): void {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    switch (event.type) {
      case 'roulette:spin':
        this.handleSpin((payload.bets as IncomingBet[]) ?? this.defaultBets());
        break;
      default:
        break;
    }
  }

  private handleSpin(incoming: IncomingBet[]): void {
    const bets = this.normalize(incoming);
    const round = this.state.round + 1;
    const engine = new RouletteEngine(this.ruleset, `${this.host.context.seed}:${round}`);
    const result = engine.spin(`${this.host.context.sessionId}:${round}`, bets);
    this.commitResult(round, result);
  }

  private commitResult(round: number, result: RouletteRoundResult): void {
    const entry: RoundHistoryEntry = {
      roundId: result.roundId,
      variant: result.variant,
      pocket: result.pocket,
      label: result.pocketLabel,
      color: result.color,
      totalBet: result.settlement.totalBet,
      totalWin: result.settlement.totalWin,
      at: Date.now(),
    };
    this.history.record(entry);

    const totalBet = Number(result.settlement.totalBet);
    const totalWin = Number(result.settlement.totalWin);
    this.host.results.record({
      roundId: result.roundId,
      outcome: totalWin > totalBet ? 'WIN' : totalWin > 0 ? 'PARTIAL' : 'LOSS',
      betAmount: result.settlement.totalBet,
      winAmount: result.settlement.totalWin,
      multiplier: totalBet > 0 ? totalWin / totalBet : 0,
      payload: { pocket: result.pocket, color: result.color, winningBets: result.winningBets },
    });
    this.host.statistics.increment('rounds');
    this.host.statistics.observe('pocket', result.pocket);
    this.host.replay.record('roulette:spin', {
      roundId: result.roundId,
      pocket: result.pocket,
      seed: result.verification.seed,
    });

    this.host.state.update((draft) => {
      draft.phase = 'settled';
      draft.round = round;
      draft.lastPocket = result.pocket;
      draft.lastColor = result.color;
      draft.lastResult = result;
      draft.history = [entry, ...draft.history].slice(0, 20);
    });

    this.emitEvent('roulette:result', result);
  }

  private normalize(bets: IncomingBet[]): RouletteBet[] {
    return bets.map((b) => ({
      type: b.type,
      amount: b.amount,
      selection: b.selection ?? (typeof b.value === 'number' ? [b.value] : undefined),
    }));
  }

  private defaultBets(): RouletteBet[] {
    const first = this.ruleset.betTypes[0];
    return first ? [{ type: first.key, amount: '1', selection: [first.selectionSize ? 7 : 0] }] : [];
  }
}

export const createRoulettePlugin = (): RoulettePlugin => new RoulettePlugin();

export const rouletteRegistration: PluginRegistration = {
  metadata: rouletteMetadata,
  factory: createRoulettePlugin,
};
