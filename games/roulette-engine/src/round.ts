/** Lifecycle phases of a single roulette round. */
export type RoundPhase = 'betting' | 'spinning' | 'settled';

export interface RoundClock {
  phase: RoundPhase;
  round: number;
  /** Epoch ms when betting closes; null outside the betting phase. */
  bettingClosesAt: number | null;
}

/**
 * Tracks round progression and the betting window. Time is injected so the
 * manager stays deterministic and testable (no ambient clock).
 */
export class RoundManager {
  private phase: RoundPhase = 'betting';
  private round = 0;
  private bettingClosesAt: number | null = null;

  constructor(private readonly roundTimerMs: number) {}

  /** Open betting for the next round; returns the new round number. */
  openBetting(now: number): number {
    this.round += 1;
    this.phase = 'betting';
    this.bettingClosesAt = now + this.roundTimerMs;
    return this.round;
  }

  closeBetting(): void {
    this.phase = 'spinning';
    this.bettingClosesAt = null;
  }

  settle(): void {
    this.phase = 'settled';
  }

  bettingOpen(now: number): boolean {
    return this.phase === 'betting' && (this.bettingClosesAt === null || now < this.bettingClosesAt);
  }

  clock(): RoundClock {
    return { phase: this.phase, round: this.round, bettingClosesAt: this.bettingClosesAt };
  }
}
