import { Injectable } from '@nestjs/common';

import { WalletEngineService, type MovementResult, type WalletView } from './wallet-engine.service';

/**
 * Reservation lifecycle for the game flow: reserve funds before a round, commit
 * them on settlement, or release them if the round is cancelled. Thin, typed
 * facade over the engine's atomic reservation primitives.
 */
@Injectable()
export class ReservationService {
  constructor(private readonly engine: WalletEngineService) {}

  reserve(
    userId: string,
    currencyId: string,
    amount: string,
    reference: string,
    idempotencyKey?: string,
  ): Promise<{ reservationId: string; wallet: WalletView }> {
    return this.engine.reserve(userId, currencyId, amount, reference, idempotencyKey);
  }

  commit(
    reservationId: string,
    winAmount: string,
    reference: string,
    idempotencyKey?: string,
  ): Promise<MovementResult> {
    return this.engine.commitReservation(reservationId, winAmount, reference, idempotencyKey);
  }

  release(reservationId: string, idempotencyKey?: string): Promise<MovementResult> {
    return this.engine.releaseReservation(reservationId, idempotencyKey);
  }
}
