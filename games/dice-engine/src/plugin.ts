import {
  BaseGamePlugin,
  GameGenre,
  type GameConfig,
  type GameEvent,
  type GamePluginMetadata,
  type PluginRegistration,
} from '@gaming-platform/game-sdk';

import { DiceEngine, type DiceRoundResult } from './engine';
import { DEFAULT_DICE_VARIANT, VariantResolver } from './presets';
import { HistoryRecorder, type RoundHistoryEntry } from './recording';
import type { DiceGameRuleSet } from './rules';

export interface DiceEngineConfig extends GameConfig {
  variant: string;
  ruleOverrides?: Partial<DiceGameRuleSet>;
}

export interface DiceEngineState {
  variant: string;
  ruleName: string;
  phase: 'ready' | 'settled';
  round: number;
  lastValues: number[];
  lastTotal: number | null;
  lastResult: DiceRoundResult | null;
  history: RoundHistoryEntry[];
}

/** Raw bet shape accepted from clients (supports a legacy `amount`-only roll). */
interface IncomingBet {
  type: string;
  amount: string;
}

export const DICE_DEFAULT_CONFIG: DiceEngineConfig = {
  variant: DEFAULT_DICE_VARIANT,
};

export const diceMetadata: GamePluginMetadata = {
  key: 'dice-engine',
  name: 'Dice Engine',
  genre: GameGenre.DICE,
  version: '2.0.0',
  minPlayers: 1,
  maxPlayers: 8,
  capabilities: ['provably-fair', 'data-driven', 'multi-variant', 'replay', 'table'],
  defaultConfig: DICE_DEFAULT_CONFIG,
};

/**
 * The data-driven Dice Engine plugin. A single plugin powers every dice game;
 * the active table is chosen by the `variant` config and resolved into a
 * ruleset. Each roll runs on a deterministic, provably-fair seed.
 */
export class DicePlugin extends BaseGamePlugin<DiceEngineConfig, DiceEngineState> {
  readonly metadata = diceMetadata;

  private ruleset!: DiceGameRuleSet;
  private readonly resolver = new VariantResolver();
  private readonly history = new HistoryRecorder(50);

  createInitialState(): DiceEngineState {
    return {
      variant: DEFAULT_DICE_VARIANT,
      ruleName: '',
      phase: 'ready',
      round: 0,
      lastValues: [],
      lastTotal: null,
      lastResult: null,
      history: [],
    };
  }

  protected onConfigure(): void {
    const variant = this.config.variant ?? DEFAULT_DICE_VARIANT;
    this.ruleset = this.resolver.resolve(variant, this.config.ruleOverrides);
    this.host.state.update((draft) => {
      draft.variant = this.ruleset.key;
      draft.ruleName = this.ruleset.name;
    });
  }

  protected onStart(): void {
    this.emitEvent('dice:ready', {
      variant: this.ruleset.key,
      name: this.ruleset.name,
      diceCount: this.ruleset.diceCount,
      faces: this.ruleset.faces,
      bets: this.ruleset.bets,
      limits: this.ruleset.limits,
      houseRules: this.ruleset.houseRules,
    });
  }

  protected onEvent(event: GameEvent): void {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    if (event.type === 'dice:roll') {
      this.handleRoll((payload.bets as IncomingBet[]) ?? this.defaultBets(payload));
    }
  }

  private handleRoll(incoming: IncomingBet[]): void {
    const bets = incoming.map((b) => ({ type: b.type, amount: b.amount }));
    const round = this.state.round + 1;
    const engine = new DiceEngine(this.ruleset, `${this.host.context.seed}:${round}`);
    const result = engine.roll(`${this.host.context.sessionId}:${round}`, bets);
    this.commitResult(round, result);
  }

  private commitResult(round: number, result: DiceRoundResult): void {
    const entry: RoundHistoryEntry = {
      roundId: result.roundId,
      variant: result.variant,
      values: result.values,
      total: result.total,
      winningBets: result.winningBets,
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
      payload: { values: result.values, total: result.total, winningBets: result.winningBets },
    });
    this.host.statistics.increment('rounds');
    this.host.statistics.observe('total', result.total);
    this.host.replay.record('dice:roll', {
      roundId: result.roundId,
      values: result.values,
      seed: result.verification.seed,
    });

    this.host.state.update((draft) => {
      draft.phase = 'settled';
      draft.round = round;
      draft.lastValues = result.values;
      draft.lastTotal = result.total;
      draft.lastResult = result;
      draft.history = [entry, ...draft.history].slice(0, 20);
    });

    this.emitEvent('dice:result', result);
  }

  private defaultBets(payload: Record<string, unknown>): IncomingBet[] {
    const first = this.ruleset.bets[0];
    const amount = typeof payload.amount === 'string' ? payload.amount : '1';
    return first ? [{ type: first.key, amount }] : [];
  }
}

export const createDicePlugin = (): DicePlugin => new DicePlugin();

export const diceRegistration: PluginRegistration = {
  metadata: diceMetadata,
  factory: createDicePlugin,
};
