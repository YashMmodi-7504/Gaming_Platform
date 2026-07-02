import type { GameResultRecord } from '../types';

export interface CreateResultInput {
  roundId: string;
  outcome: string;
  betAmount: string;
  winAmount: string;
  multiplier?: number;
  payload?: Record<string, unknown>;
}

/**
 * Records and validates the authoritative result of each round. Results are the
 * settlement source of truth handed to the wallet/ledger by the host.
 */
export class GameResultManager {
  private readonly results: GameResultRecord[] = [];

  record(input: CreateResultInput): GameResultRecord {
    if (!input.roundId) throw new Error('Result requires a roundId');
    if (Number.isNaN(Number(input.betAmount)) || Number(input.betAmount) < 0) {
      throw new Error('Result betAmount must be a non-negative number');
    }
    if (Number.isNaN(Number(input.winAmount)) || Number(input.winAmount) < 0) {
      throw new Error('Result winAmount must be a non-negative number');
    }
    const record: GameResultRecord = {
      roundId: input.roundId,
      outcome: input.outcome,
      betAmount: input.betAmount,
      winAmount: input.winAmount,
      multiplier: input.multiplier,
      payload: input.payload ?? {},
      createdAt: Date.now(),
    };
    this.results.push(record);
    return record;
  }

  last(): GameResultRecord | undefined {
    return this.results[this.results.length - 1];
  }

  all(): readonly GameResultRecord[] {
    return this.results;
  }

  totals(): { rounds: number; totalBet: number; totalWin: number; net: number } {
    let totalBet = 0;
    let totalWin = 0;
    for (const r of this.results) {
      totalBet += Number(r.betAmount);
      totalWin += Number(r.winAmount);
    }
    return { rounds: this.results.length, totalBet, totalWin, net: totalWin - totalBet };
  }

  clear(): void {
    this.results.length = 0;
  }
}
