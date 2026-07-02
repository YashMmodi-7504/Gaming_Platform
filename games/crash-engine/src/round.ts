/** Lifecycle phases of a single crash round. */
export type RoundPhase = 'betting' | 'running' | 'crashed';

export interface RoundClock {
  phase: RoundPhase;
  round: number;
  /** Epoch ms when betting closes; null outside the betting phase. */
  bettingClosesAt: number | null;
  /** Epoch ms when the running curve started; null until it does. */
  startedAt: number | null;
}

/**
 * Tracks round progression, the betting window and curve start time. Time is
 * injected so the manager stays deterministic and testable (no ambient clock).
 */
export class RoundManager {
  private phase: RoundPhase = 'betting';
  private round = 0;
  private bettingClosesAt: number | null = null;
  private startedAt: number | null = null;

  constructor(private readonly bettingWindowMs: number) {}

  /** Open betting for the next round; returns the new round number. */
  openBetting(now: number): number {
    this.round += 1;
    this.phase = 'betting';
    this.bettingClosesAt = now + this.bettingWindowMs;
    this.startedAt = null;
    return this.round;
  }

  startRunning(now: number): void {
    this.phase = 'running';
    this.bettingClosesAt = null;
    this.startedAt = now;
  }

  crash(): void {
    this.phase = 'crashed';
  }

  bettingOpen(now: number): boolean {
    return this.phase === 'betting' && (this.bettingClosesAt === null || now < this.bettingClosesAt);
  }

  /** Elapsed ms since the curve started, or 0 if not running. */
  elapsed(now: number): number {
    return this.startedAt === null ? 0 : Math.max(0, now - this.startedAt);
  }

  clock(): RoundClock {
    return {
      phase: this.phase,
      round: this.round,
      bettingClosesAt: this.bettingClosesAt,
      startedAt: this.startedAt,
    };
  }
}
