import type { RouletteColor } from './rules';

export interface RoundHistoryEntry {
  roundId: string;
  variant: string;
  pocket: number;
  label: string;
  color: RouletteColor;
  totalBet: string;
  totalWin: string;
  at: number;
}

/** Rolling history of completed spins (most-recent first). */
export class HistoryRecorder {
  private entries: RoundHistoryEntry[] = [];

  constructor(private readonly limit = 50) {}

  record(entry: RoundHistoryEntry): void {
    this.entries = [entry, ...this.entries].slice(0, this.limit);
  }

  list(): readonly RoundHistoryEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
  }
}

export interface StatisticsSnapshot {
  rounds: number;
  hits: Record<string, number>;
  colors: Record<RouletteColor, number>;
  hot: number[];
  cold: number[];
  totalWagered: number;
  totalReturned: number;
  houseEdge: number;
}

/** Aggregates per-table statistics across spins (hits, hot/cold, edge). */
export class StatisticsCollector {
  private rounds = 0;
  private readonly hits = new Map<number, number>();
  private readonly colors: Record<RouletteColor, number> = { red: 0, black: 0, green: 0 };
  private totalWagered = 0;
  private totalReturned = 0;

  record(input: { pocket: number; color: RouletteColor; totalBet: number; totalWin: number }): void {
    this.rounds += 1;
    this.totalWagered += input.totalBet;
    this.totalReturned += input.totalWin;
    this.hits.set(input.pocket, (this.hits.get(input.pocket) ?? 0) + 1);
    this.colors[input.color] += 1;
  }

  private ranked(): number[] {
    return [...this.hits.entries()].sort((a, b) => b[1] - a[1]).map(([pocket]) => pocket);
  }

  snapshot(): StatisticsSnapshot {
    const ranked = this.ranked();
    return {
      rounds: this.rounds,
      hits: Object.fromEntries(this.hits),
      colors: { ...this.colors },
      hot: ranked.slice(0, 5),
      cold: ranked.slice(-5).reverse(),
      totalWagered: this.totalWagered,
      totalReturned: this.totalReturned,
      houseEdge:
        this.totalWagered > 0 ? (this.totalWagered - this.totalReturned) / this.totalWagered : 0,
    };
  }
}

export interface ReplayFrameRecord {
  seq: number;
  type: string;
  data: Record<string, unknown>;
}

/** Records an ordered, replayable stream of round frames. */
export class ReplayRecorder {
  private frames: ReplayFrameRecord[] = [];
  private seq = 0;

  constructor(private readonly seed: string) {}

  record(type: string, data: Record<string, unknown> = {}): void {
    this.frames.push({ seq: this.seq++, type, data });
  }

  serialize() {
    return { seed: this.seed, frameCount: this.frames.length, frames: this.frames };
  }

  clear(): void {
    this.frames = [];
    this.seq = 0;
  }
}

/** Presentation hooks the engine fires; the UI subscribes to drive animation. */
export interface AnimationHooks {
  onSpinStart(rotation: number): void;
  onBallLand(pocket: number, color: RouletteColor): void;
  onWin(winningTypes: string[]): void;
}

/** Presentation hooks the engine fires for audio cues. */
export interface AudioHooks {
  onSpin(): void;
  onWin(): void;
  onLose(): void;
}

export const NOOP_ANIMATION_HOOKS: AnimationHooks = {
  onSpinStart: () => undefined,
  onBallLand: () => undefined,
  onWin: () => undefined,
};

export const NOOP_AUDIO_HOOKS: AudioHooks = {
  onSpin: () => undefined,
  onWin: () => undefined,
  onLose: () => undefined,
};
