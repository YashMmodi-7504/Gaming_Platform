import type { ReplayFrame } from '../types';

export interface SerializedReplay {
  seed: string;
  startedAt: number;
  durationMs: number;
  frames: ReplayFrame[];
}

/**
 * Records an ordered, timestamped stream of frames. Combined with the
 * deterministic seed, a replay fully reconstructs a session round-by-round.
 */
export class GameReplayManager {
  private frames: ReplayFrame[] = [];
  private seq = 0;
  private startedAt = Date.now();
  private recording = true;

  constructor(private readonly seed: string) {}

  record(type: string, data: Record<string, unknown> = {}): ReplayFrame {
    const frame: ReplayFrame = { seq: this.seq++, ts: Date.now(), type, data };
    if (this.recording) this.frames.push(frame);
    return frame;
  }

  pause(): void {
    this.recording = false;
  }

  resume(): void {
    this.recording = true;
  }

  getFrames(): readonly ReplayFrame[] {
    return this.frames;
  }

  serialize(): SerializedReplay {
    return {
      seed: this.seed,
      startedAt: this.startedAt,
      durationMs: Date.now() - this.startedAt,
      frames: this.frames,
    };
  }

  load(replay: SerializedReplay): void {
    this.frames = [...replay.frames];
    this.seq = this.frames.length;
    this.startedAt = replay.startedAt;
  }

  clear(): void {
    this.frames = [];
    this.seq = 0;
    this.startedAt = Date.now();
  }

  get frameCount(): number {
    return this.frames.length;
  }
}
