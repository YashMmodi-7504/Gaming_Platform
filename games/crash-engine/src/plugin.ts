import {
  BaseGamePlugin,
  GameGenre,
  type GameConfig,
  type GameEvent,
  type GamePluginMetadata,
  type PluginRegistration,
} from '@gaming-platform/game-sdk';

import { CrashEngine, type CrashRoundResult } from './engine';
import { MultiplierManager } from './multiplier';
import { DEFAULT_CRASH_VARIANT, VariantResolver } from './presets';
import { ProvablyFairCrashGenerator } from './provably-fair';
import { HistoryRecorder, type RoundHistoryEntry } from './recording';
import type { CrashGameRuleSet } from './rules';
import type { CrashBet } from './bets';

export interface CrashEngineConfig extends GameConfig {
  variant: string;
  ruleOverrides?: Partial<CrashGameRuleSet>;
}

export type CrashPhase = 'ready' | 'running' | 'crashed';

export interface CrashEngineState {
  variant: string;
  ruleName: string;
  phase: CrashPhase;
  round: number;
  multiplier: number;
  cashedOutAt: number | null;
  crashPoint: number | null;
  lastResult: CrashRoundResult | null;
  history: RoundHistoryEntry[];
}

interface ActiveRound {
  bet: CrashBet;
  crashPoint: number;
  ticks: number;
  cashedOutAt: number | null;
}

export const CRASH_DEFAULT_CONFIG: CrashEngineConfig = {
  variant: DEFAULT_CRASH_VARIANT,
};

export const crashMetadata: GamePluginMetadata = {
  key: 'crash-engine',
  name: 'Crash Engine',
  genre: GameGenre.CRASH,
  version: '2.0.0',
  minPlayers: 1,
  maxPlayers: 8,
  capabilities: ['provably-fair', 'data-driven', 'multi-variant', 'realtime', 'cashout', 'replay'],
  defaultConfig: CRASH_DEFAULT_CONFIG,
};

/**
 * The data-driven Crash Engine plugin. A single plugin powers every multiplier
 * game; the active table is chosen by the `variant` config and resolved into a
 * ruleset. Each round's crash point is deterministic and provably fair; the
 * rising curve is driven by the runtime timer for realtime play.
 */
export class CrashPlugin extends BaseGamePlugin<CrashEngineConfig, CrashEngineState> {
  readonly metadata = crashMetadata;

  private ruleset!: CrashGameRuleSet;
  private curve!: MultiplierManager;
  private readonly resolver = new VariantResolver();
  private readonly history = new HistoryRecorder(50);
  private active: ActiveRound | null = null;

  createInitialState(): CrashEngineState {
    return {
      variant: DEFAULT_CRASH_VARIANT,
      ruleName: '',
      phase: 'ready',
      round: 0,
      multiplier: 1,
      cashedOutAt: null,
      crashPoint: null,
      lastResult: null,
      history: [],
    };
  }

  protected onConfigure(): void {
    const variant = this.config.variant ?? DEFAULT_CRASH_VARIANT;
    this.ruleset = this.resolver.resolve(variant, this.config.ruleOverrides);
    this.curve = new MultiplierManager(this.ruleset);
    this.host.state.update((draft) => {
      draft.variant = this.ruleset.key;
      draft.ruleName = this.ruleset.name;
    });
  }

  protected onStart(): void {
    this.emitEvent('crash:ready', {
      variant: this.ruleset.key,
      name: this.ruleset.name,
      minMultiplier: this.ruleset.minMultiplier,
      maxMultiplier: this.ruleset.maxMultiplier,
      limits: this.ruleset.limits,
      tickMs: this.ruleset.tickMs,
      allowAutoCashout: this.ruleset.allowAutoCashout,
      allowManualCashout: this.ruleset.allowManualCashout,
    });
  }

  protected onStop(): void {
    this.host.timers.clearAll();
  }

  protected onEvent(event: GameEvent): void {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    if (event.type === 'crash:start') {
      this.handleStart({
        amount: typeof payload.amount === 'string' ? payload.amount : '1',
        autoCashout: typeof payload.autoCashout === 'number' ? payload.autoCashout : undefined,
      });
    } else if (event.type === 'crash:cashout') {
      this.handleCashout();
    }
  }

  private handleStart(bet: CrashBet): void {
    if (this.active) return;
    const round = this.state.round + 1;
    const seed = `${this.host.context.seed}:${round}`;
    const crashPoint = ProvablyFairCrashGenerator.fromRuleset(seed, this.ruleset);
    this.active = { bet, crashPoint, ticks: 0, cashedOutAt: null };

    this.host.state.update((draft) => {
      draft.phase = 'running';
      draft.round = round;
      draft.multiplier = this.ruleset.minMultiplier;
      draft.cashedOutAt = null;
      draft.crashPoint = null;
    });
    this.emitEvent('crash:started', { round, amount: bet.amount, autoCashout: bet.autoCashout ?? null });
    this.host.timers.setInterval(() => this.tick(), this.ruleset.tickMs);
  }

  private tick(): void {
    const active = this.active;
    if (!active) return;
    active.ticks += 1;
    const elapsed = active.ticks * this.ruleset.tickMs;
    const multiplier = this.curve.valueAt(elapsed);

    // Auto cash-out fires the moment the curve reaches the target.
    if (
      active.cashedOutAt === null &&
      this.ruleset.allowAutoCashout &&
      typeof active.bet.autoCashout === 'number' &&
      multiplier >= active.bet.autoCashout &&
      active.bet.autoCashout < active.crashPoint
    ) {
      active.cashedOutAt = active.bet.autoCashout;
      this.emitEvent('crash:cashed-out', { multiplier: active.cashedOutAt, auto: true });
    }

    if (multiplier >= active.crashPoint || elapsed >= this.ruleset.roundDurationCapMs) {
      this.host.timers.clearAll();
      this.settle();
      return;
    }

    this.host.state.update((draft) => {
      draft.multiplier = multiplier;
    });
    this.emitEvent('crash:tick', { multiplier, elapsedMs: elapsed });
  }

  private handleCashout(): void {
    const active = this.active;
    if (!active || active.cashedOutAt !== null || !this.ruleset.allowManualCashout) return;
    const multiplier = this.state.multiplier;
    if (multiplier >= active.crashPoint) return;
    active.cashedOutAt = multiplier;
    this.host.state.update((draft) => {
      draft.cashedOutAt = multiplier;
    });
    this.emitEvent('crash:cashed-out', { multiplier, auto: false });
  }

  private settle(): void {
    const active = this.active;
    if (!active) return;
    this.active = null;
    const round = this.state.round;
    const seed = `${this.host.context.seed}:${round}`;
    const engine = new CrashEngine(this.ruleset, seed);
    const result = engine.playRound(`${this.host.context.sessionId}:${round}`, [active.bet], [
      active.cashedOutAt,
    ]);
    this.commitResult(round, result);
  }

  private commitResult(round: number, result: CrashRoundResult): void {
    const cashedOutAt = result.settlement.bets[0]?.cashedOutAt ?? null;
    const entry: RoundHistoryEntry = {
      roundId: result.roundId,
      variant: result.variant,
      crashPoint: result.crashPoint,
      cashedOutAt,
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
      multiplier: cashedOutAt ?? result.crashPoint,
      payload: { crashPoint: result.crashPoint, cashedOutAt },
    });
    this.host.statistics.increment('rounds');
    this.host.statistics.observe('crash', result.crashPoint);
    this.host.replay.record('crash:round', {
      roundId: result.roundId,
      crashPoint: result.crashPoint,
      seed: result.verification.seed,
    });

    this.host.state.update((draft) => {
      draft.phase = 'crashed';
      draft.round = round;
      draft.multiplier = result.crashPoint;
      draft.crashPoint = result.crashPoint;
      draft.cashedOutAt = cashedOutAt;
      draft.lastResult = result;
      draft.history = [entry, ...draft.history].slice(0, 20);
    });

    this.emitEvent('crash:result', result);
  }
}

export const createCrashPlugin = (): CrashPlugin => new CrashPlugin();

export const crashRegistration: PluginRegistration = {
  metadata: crashMetadata,
  factory: createCrashPlugin,
};
