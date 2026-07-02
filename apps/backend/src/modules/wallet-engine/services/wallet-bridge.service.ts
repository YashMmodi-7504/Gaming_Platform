import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

import { SettlementService } from './settlement.service';
import { WalletBalanceService } from './wallet-balance.service';
import { WalletGateway } from '../wallet.gateway';

export interface ReserveBetInput {
  userId: string;
  currencyId: string | null;
  amount: string;
  reference: string;
  idempotencyKey?: string;
}

export interface SettleInput {
  userId: string;
  reservationId: string | null;
  winAmount: string;
  reference: string;
  idempotencyKey?: string;
}

/**
 * The single, mandatory integration point between every game engine and the
 * Wallet Engine. Engines never touch balances directly — they call the bridge to
 * reserve a stake before a round and settle (commit) it afterwards. The bridge
 * enforces the canonical flow:
 *
 *   reserve → start game → game ends → commit → ledger → wallet → realtime
 *
 * In demo mode (no currency bound) the bridge is a safe no-op, so demo play never
 * touches real funds while real-money play is always fully ledgered.
 */
@Injectable()
export class WalletBridgeService {
  constructor(
    private readonly settlement: SettlementService,
    private readonly balances: WalletBalanceService,
    private readonly gateway: WalletGateway,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /** Reserve a stake for an upcoming round. Returns null in demo mode. */
  async reserveBet(input: ReserveBetInput): Promise<string | null> {
    if (!input.currencyId || Number(input.amount) <= 0) return null;
    const { reservationId, wallet } = await this.settlement.reserveStake(
      input.userId,
      input.currencyId,
      input.amount,
      input.reference,
      input.idempotencyKey,
    );
    this.gateway.emitBalances(input.userId, [wallet]);
    return reservationId;
  }

  /** Commit a reserved round: consume the stake and credit winnings. */
  async settle(input: SettleInput): Promise<void> {
    if (!input.reservationId) return;
    const result = await this.settlement.settle(
      input.reservationId,
      input.winAmount,
      input.reference,
      input.idempotencyKey,
    );
    this.gateway.emitBalances(input.userId, [result.wallet]);
    this.gateway.emitSettlement(input.userId, {
      reference: input.reference,
      winAmount: input.winAmount,
      balance: result.wallet,
    });
  }

  /** Cancel a reserved round, returning the stake. */
  async cancel(userId: string, reservationId: string | null): Promise<void> {
    if (!reservationId) return;
    const result = await this.settlement.cancel(reservationId);
    this.gateway.emitBalances(userId, [result.wallet]);
  }

  /**
   * Reserve-and-commit in one step for stateless rounds (dice/roulette/card),
   * where the bet and the result occur together. Still fully ledgered.
   */
  async settleImmediate(input: {
    userId: string;
    currencyId: string | null;
    betAmount: string;
    winAmount: string;
    reference: string;
    idempotencyKey?: string;
  }): Promise<void> {
    if (!input.currencyId || Number(input.betAmount) <= 0) return;
    try {
      const reservationId = await this.reserveBet({
        userId: input.userId,
        currencyId: input.currencyId,
        amount: input.betAmount,
        reference: input.reference,
        idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:rsv` : undefined,
      });
      await this.settle({
        userId: input.userId,
        reservationId,
        winAmount: input.winAmount,
        reference: input.reference,
        idempotencyKey: input.idempotencyKey,
      });
    } catch (error) {
      this.logger.error('Wallet settlement failed', {
        context: 'WalletBridgeService',
        reference: input.reference,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
