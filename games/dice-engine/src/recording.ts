export interface RoundHistoryEntry {
  roundId: string;
  variant: string;
  values: number[];
  total: number;
  winningBets: string[];
  totalBet: string;
  totalWin: string;
  at: number;
}

/** Rolling history of completed rolls (most-recent first). */
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
  totals: Record<number, number>;
  faces: Record<number, number>;
  big: number;
  small: number;
  triples: number;
  totalWagered: number;
  totalReturned: number;
  houseEdge: number;
}

/** Aggregates per-table statistics across rolls (totals, faces, big/small, edge). */
export class StatisticsCollector {
  private rounds = 0;
  private readonly totals = new Map<number, number>();
  private readonly faces = new Map<number, number>();
  private big = 0;
  private small = 0;
  private triples = 0;
  private totalWagered = 0;
  private totalReturned = 0;

  record(input: {
    values: number[];
    total: number;
    range: 'big' | 'small';
    isTriple: boolean;
    totalBet: number;
    totalWin: number;
  }): void {
    this.rounds += 1;
    this.totalWagered += input.totalBet;
    this.totalReturned += input.totalWin;
    this.totals.set(input.total, (this.totals.get(input.total) ?? 0) + 1);
    for (const v of input.values) this.faces.set(v, (this.faces.get(v) ?? 0) + 1);
    if (input.isTriple) this.triples += 1;
    if (input.range === 'big') this.big += 1;
    else this.small += 1;
  }

  snapshot(): StatisticsSnapshot {
    return {
      rounds: this.rounds,
      totals: Object.fromEntries(this.totals),
      faces: Object.fromEntries(this.faces),
      big: this.big,
      small: this.small,
      triples: this.triples,
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
  onRollStart(spins: number[]): void;
  onDiceLand(values: number[]): void;
  onWin(winningTypes: string[]): void;
}

/** Presentation hooks the engine fires for audio cues. */
export interface AudioHooks {
  onRoll(): void;
  onWin(): void;
  onLose(): void;
}

export const NOOP_ANIMATION_HOOKS: AnimationHooks = {
  onRollStart: () => undefined,
  onDiceLand: () => undefined,
  onWin: () => undefined,
};

export const NOOP_AUDIO_HOOKS: AudioHooks = {
  onRoll: () => undefined,
  onWin: () => undefined,
  onLose: () => undefined,
};
