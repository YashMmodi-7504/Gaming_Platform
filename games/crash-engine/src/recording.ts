export interface RoundHistoryEntry {
  roundId: string;
  variant: string;
  crashPoint: number;
  cashedOutAt: number | null;
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

export interface StatisticsSnapshot {
  rounds: number;
  busts: number;
  bands: Record<string, number>;
  maxCrash: number;
  averageCrash: number;
  totalWagered: number;
  totalReturned: number;
  houseEdge: number;
}

/** Aggregates per-table statistics across rounds (bands, averages, edge). */
export class StatisticsCollector {
  private rounds = 0;
  private busts = 0;
  private readonly bands: Record<string, number> = { low: 0, mid: 0, high: 0, extreme: 0 };
  private maxCrash = 0;
  private crashSum = 0;
  private totalWagered = 0;
  private totalReturned = 0;

  record(input: {
    crashPoint: number;
    band: string;
    instantBust: boolean;
    totalBet: number;
    totalWin: number;
  }): void {
    this.rounds += 1;
    this.crashSum += input.crashPoint;
    this.maxCrash = Math.max(this.maxCrash, input.crashPoint);
    this.totalWagered += input.totalBet;
    this.totalReturned += input.totalWin;
    if (input.instantBust) this.busts += 1;
    if (this.bands[input.band] !== undefined) {
      this.bands[input.band] = (this.bands[input.band] ?? 0) + 1;
    }
  }

  snapshot(): StatisticsSnapshot {
    return {
      rounds: this.rounds,
      busts: this.busts,
      bands: { ...this.bands },
      maxCrash: this.maxCrash,
      averageCrash: this.rounds > 0 ? this.crashSum / this.rounds : 0,
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
  onTick(multiplier: number, elapsedMs: number): void;
  onCrash(crashPoint: number): void;
  onCashout(multiplier: number): void;
}

/** Presentation hooks the engine fires for audio cues. */
export interface AudioHooks {
  onTakeoff(): void;
  onCashout(): void;
  onCrash(): void;
}

export const NOOP_ANIMATION_HOOKS: AnimationHooks = {
  onTick: () => undefined,
  onCrash: () => undefined,
  onCashout: () => undefined,
};

export const NOOP_AUDIO_HOOKS: AudioHooks = {
  onTakeoff: () => undefined,
  onCashout: () => undefined,
  onCrash: () => undefined,
};
