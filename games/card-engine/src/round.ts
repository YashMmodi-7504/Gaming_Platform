export type RoundPhase = 'idle' | 'betting' | 'dealing' | 'action' | 'reveal' | 'settled';

/** Tracks the current round number and phase for a card table. */
export class RoundManager {
  private round = 0;
  private phase: RoundPhase = 'idle';

  current(): number {
    return this.round;
  }

  getPhase(): RoundPhase {
    return this.phase;
  }

  begin(): number {
    this.round += 1;
    this.phase = 'betting';
    return this.round;
  }

  setPhase(phase: RoundPhase): void {
    this.phase = phase;
  }

  reset(): void {
    this.phase = 'idle';
  }
}

/** Manages turn order for interactive games (e.g. blackjack hit/stand). */
export class TurnManager {
  private order: number[] = [];
  private index = 0;

  setOrder(seats: number[]): void {
    this.order = [...seats];
    this.index = 0;
  }

  current(): number | null {
    return this.order[this.index] ?? null;
  }

  next(): number | null {
    this.index += 1;
    return this.current();
  }

  isComplete(): boolean {
    return this.index >= this.order.length;
  }

  reset(): void {
    this.index = 0;
  }
}
