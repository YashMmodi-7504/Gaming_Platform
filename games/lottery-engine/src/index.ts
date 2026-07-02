import {
  BaseGamePlugin,
  GameGenre,
  type GameConfig,
  type GameEvent,
  type GamePluginMetadata,
  type PluginRegistration,
  type Rng,
} from '@gaming-platform/game-sdk';

export interface LotteryConfig extends GameConfig {
  pool: number;
  pick: number;
  /** Payout multiplier keyed by number of matches. */
  prizeTiers: Record<string, number>;
}

export interface LotteryState {
  lastDraw: number[];
  lastMatches: number | null;
  roundsPlayed: number;
}

export interface LotteryDrawPayload {
  ticket: number[];
  amount: string;
}

/** Draw `pick` distinct numbers from 1..pool, deterministically and sorted. */
export function drawNumbers(rng: Rng, pool: number, pick: number): number[] {
  const all = Array.from({ length: pool }, (_, i) => i + 1);
  return rng.shuffle(all).slice(0, Math.min(pick, pool)).sort((a, b) => a - b);
}

export function countMatches(ticket: readonly number[], draw: readonly number[]): number {
  const drawn = new Set(draw);
  return ticket.filter((n) => drawn.has(n)).length;
}

export const LOTTERY_DEFAULT_CONFIG: LotteryConfig = {
  pool: 49,
  pick: 6,
  prizeTiers: { '3': 5, '4': 50, '5': 500, '6': 50000 },
};

export const lotteryMetadata: GamePluginMetadata = {
  key: 'lottery-engine',
  name: 'Lottery Engine',
  genre: GameGenre.LOTTERY,
  version: '1.0.0',
  minPlayers: 1,
  maxPlayers: 1,
  capabilities: ['provably-fair', 'draw', 'tiered-payout'],
  defaultConfig: LOTTERY_DEFAULT_CONFIG,
};

/** Reusable lottery genre engine — pick-K-of-N draws with tiered payouts. */
export class LotteryPlugin extends BaseGamePlugin<LotteryConfig, LotteryState> {
  readonly metadata = lotteryMetadata;

  createInitialState(): LotteryState {
    return { lastDraw: [], lastMatches: null, roundsPlayed: 0 };
  }

  protected onStart(): void {
    this.emitEvent('lottery:ready', { config: this.config });
  }

  protected onEvent(event: GameEvent): void {
    if (event.type === 'lottery:draw') {
      this.handleDraw(event.payload as LotteryDrawPayload);
    }
  }

  private handleDraw(payload: LotteryDrawPayload): void {
    const config = this.config;
    const draw = drawNumbers(this.host.rng, config.pool, config.pick);
    const matches = countMatches(payload.ticket ?? [], draw);
    const multiplier = config.prizeTiers[String(matches)] ?? 0;
    const amount = payload.amount ?? '0';
    const winAmount = (Number(amount) * multiplier).toString();
    const roundsPlayed = this.state.roundsPlayed + 1;

    const result = this.host.results.record({
      roundId: `${this.host.context.sessionId}:${roundsPlayed}`,
      outcome: multiplier > 0 ? 'WIN' : 'LOSS',
      betAmount: amount,
      winAmount,
      multiplier,
      payload: { draw, ticket: payload.ticket, matches },
    });

    this.host.statistics.increment('rounds');
    this.host.statistics.observe('matches', matches);

    this.host.state.update((draft) => {
      draft.lastDraw = draw;
      draft.lastMatches = matches;
      draft.roundsPlayed = roundsPlayed;
    });

    this.emitEvent('lottery:result', { draw, matches, winAmount, result });
  }
}

export const createLotteryPlugin = (): LotteryPlugin => new LotteryPlugin();

export const lotteryRegistration: PluginRegistration = {
  metadata: lotteryMetadata,
  factory: createLotteryPlugin,
};
