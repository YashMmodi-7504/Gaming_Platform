import { Injectable } from '@nestjs/common';

import { WalletEngineService, type MovementResult } from './wallet-engine.service';
import { ReservationService } from './reservation.service';

/**
 * Game-round settlement. Drives the canonical flow:
 * reserve → (play) → commit (stake consumed, winnings credited), or release on
 * cancellation, or rollback on correction. Used by the wallet bridge that every
 * game engine integrates with.
 */
@Injectable()
export class SettlementService {
  constructor(
    private readonly engine: WalletEngineService,
    private readonly reservations: ReservationService,
  ) {}

  /** Reserve a stake for a round; returns the reservation id. */
  reserveStake(
    userId: string,
    currencyId: string,
    amount: string,
    reference: string,
    idempotencyKey?: string,
  ) {
    return this.reservations.reserve(userId, currencyId, amount, reference, idempotencyKey);
  }

  /** Settle a round: consume the reserved stake and credit the win (atomic). */
  settle(reservationId: string, winAmount: string, reference: string, idempotencyKey?: string) {
    return this.reservations.commit(reservationId, winAmount, reference, idempotencyKey);
  }

  /** Cancel a round before settlement: return the reserved stake. */
  cancel(reservationId: string, idempotencyKey?: string) {
    return this.reservations.release(reservationId, idempotencyKey);
  }

  /** Reverse a settled round (admin correction). */
  rollback(transactionId: string, idempotencyKey?: string): Promise<MovementResult> {
    return this.engine.rollback(transactionId, idempotencyKey);
  }
}
