import type { Card } from './card';

export interface RoundHistoryEntry {
  roundId: string;
  variant: string;
  winners: string[];
  totalBet: string;
  totalWin: string;
  at: number;
}

/** Rolling history of completed rounds (most-recent first). */
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

/** Aggregates per-table statistics across rounds. */
export class StatisticsCollector {
  private rounds = 0;
  private readonly winsBySide = new Map<string, number>();
  private totalWagered = 0;
  private totalReturned = 0;

  record(input: { winners: string[]; totalBet: number; totalWin: number }): void {
    this.rounds += 1;
    this.totalWagered += input.totalBet;
    this.totalReturned += input.totalWin;
    for (const side of input.winners) {
      this.winsBySide.set(side, (this.winsBySide.get(side) ?? 0) + 1);
    }
  }

  snapshot() {
    return {
      rounds: this.rounds,
      winsBySide: Object.fromEntries(this.winsBySide),
      totalWagered: this.totalWagered,
      totalReturned: this.totalReturned,
      houseEdge: this.totalWagered > 0 ? (this.totalWagered - this.totalReturned) / this.totalWagered : 0,
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
  onDeal(card: Card, side: string): void;
  onReveal(side: string, cards: Card[]): void;
  onWin(winners: string[]): void;
}

/** Presentation hooks the engine fires for audio cues. */
export interface AudioHooks {
  onDeal(): void;
  onWin(): void;
  onLose(): void;
}

export const NOOP_ANIMATION_HOOKS: AnimationHooks = {
  onDeal: () => undefined,
  onReveal: () => undefined,
  onWin: () => undefined,
};

export const NOOP_AUDIO_HOOKS: AudioHooks = {
  onDeal: () => undefined,
  onWin: () => undefined,
  onLose: () => undefined,
};
