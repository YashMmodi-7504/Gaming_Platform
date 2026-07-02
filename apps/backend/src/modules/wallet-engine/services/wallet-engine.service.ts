import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@gaming-platform/database';
import { LedgerDirection, WalletStatus, WalletType } from '@prisma/client';
import { Balance, Money, type BalanceState, type TransactionTypeCode } from '@gaming-platform/wallet-core';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SystemAccountService } from './system-account.service';

export interface WalletView {
  id: string;
  userId: string;
  currencyId: string;
  type: WalletType;
  status: WalletStatus;
  available: string;
  locked: string;
  pending: string;
  total: string;
  version: number;
}

export interface MovementResult {
  transactionId: string;
  reference: string;
  wallet: WalletView;
}

interface MutationInput {
  amount: string;
  typeCode: TransactionTypeCode;
  description?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  reference?: string;
}

const LOCK_TTL_MS = 5000;
const MAX_RETRIES = 5;

/**
 * The authoritative Wallet Engine. Every balance movement is atomic, recorded as
 * an immutable {@link Prisma} transaction with a double-entry ledger, and guarded
 * against corruption by four layers:
 *
 *  1. **Optimistic locking** — `WalletBalance.version` is checked on every write.
 *  2. **Redis locks** — serialise concurrent mutations of the same wallet.
 *  3. **Idempotency keys** — duplicate requests return the original result.
 *  4. **Non-negative algebra** — {@link Balance} (wallet-core) rejects overdrafts.
 *
 * No game or service may modify balances except through this engine.
 */
@Injectable()
export class WalletEngineService {
  private readonly typeIds = new Map<string, string>();
  private readonly statusIds = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly system: SystemAccountService,
  ) {}

  // ---- Wallet & balance reads ---------------------------------------------

  async getOrCreateWallet(
    userId: string,
    currencyId: string,
    type: WalletType = WalletType.MAIN,
  ): Promise<WalletView> {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId_currencyId_type: { userId, currencyId, type } },
      update: {},
      create: {
        userId,
        currencyId,
        type,
        isPrimary: type === WalletType.MAIN,
        balance: { create: { available: '0', locked: '0', pending: '0', total: '0' } },
      },
      include: { balance: true },
    });
    return this.toView(wallet, wallet.balance);
  }

  async getWallets(userId: string): Promise<WalletView[]> {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId, deletedAt: null },
      include: { balance: true },
      orderBy: [{ isPrimary: 'desc' }, { type: 'asc' }],
    });
    return wallets.map((w) => this.toView(w, w.balance));
  }

  async getWalletById(walletId: string): Promise<WalletView> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId }, include: { balance: true } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return this.toView(wallet, wallet.balance);
  }

  // ---- Public operations ---------------------------------------------------

  credit(userId: string, currencyId: string, input: MutationInput, type?: WalletType): Promise<MovementResult> {
    return this.applyAvailableDelta(userId, currencyId, type ?? WalletType.MAIN, input, 'credit');
  }

  debit(userId: string, currencyId: string, input: MutationInput, type?: WalletType): Promise<MovementResult> {
    return this.applyAvailableDelta(userId, currencyId, type ?? WalletType.MAIN, input, 'debit');
  }

  /** Reserve a stake (available → locked) and open a LockedFunds record. */
  async reserve(
    userId: string,
    currencyId: string,
    amount: string,
    reference: string,
    idempotencyKey?: string,
  ): Promise<{ reservationId: string; wallet: WalletView }> {
    this.assertPositive(amount);
    return this.withWallet(userId, currencyId, WalletType.MAIN, async (tx, wallet) => {
      const existing = idempotencyKey ? await this.replay(tx, idempotencyKey) : null;
      if (existing) {
        const reservation = await tx.lockedFunds.findFirst({
          where: { walletId: wallet.id, reason: reference, status: 'LOCKED' },
          orderBy: { createdAt: 'desc' },
        });
        return { reservationId: reservation?.id ?? existing.id, wallet: await this.reloadView(tx, wallet.id) };
      }
      const state = this.loadState(wallet);
      const nextState = Balance.reserve(state, amount);
      await this.writeBalance(tx, wallet.id, state.version, nextState);

      const reservation = await tx.lockedFunds.create({
        data: { userId, walletId: wallet.id, currencyId, amount, status: 'LOCKED', reason: reference },
      });
      await this.recordTxn(tx, {
        userId,
        wallet,
        currencyId,
        amount,
        typeCode: 'RESERVE',
        statusCode: 'RESERVED',
        balanceBefore: Balance.total(state),
        balanceAfter: Balance.total(nextState),
        idempotencyKey,
        reference,
        description: 'Stake reserved',
      });
      return { reservationId: reservation.id, wallet: this.viewFrom(wallet, nextState) };
    });
  }

  /** Commit a reservation: consume the stake and credit winnings atomically. */
  async commitReservation(
    reservationId: string,
    winAmount: string,
    reference: string,
    idempotencyKey?: string,
  ): Promise<MovementResult> {
    return this.run(async (tx) => {
      const reservation = await tx.lockedFunds.findUnique({ where: { id: reservationId } });
      if (!reservation) throw new NotFoundException('Reservation not found');
      if (reservation.status !== 'LOCKED') {
        // Idempotent: already settled — return the existing bet transaction.
        const txn = await tx.walletTransaction.findFirst({
          where: { walletId: reservation.walletId, reference: `${reference}:bet` },
        });
        if (txn) return this.movementFrom(tx, txn);
        throw new ConflictException('Reservation already resolved');
      }
      const wallet = await this.lockWalletRow(tx, reservation.walletId);
      const stake = reservation.amount.toString();
      const win = winAmount && Money.isPositive(winAmount) ? winAmount : '0';

      let state = this.loadState(wallet);
      state = Balance.commitReserved(state, stake);
      if (Money.isPositive(win)) state = Balance.credit(state, win);
      await this.writeBalance(tx, wallet.id, this.loadState(wallet).version, state);

      await tx.lockedFunds.update({
        where: { id: reservationId },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });

      const houseWalletId = await this.system.houseWallet(reservation.currencyId, tx);
      const betTxn = await this.recordTxn(tx, {
        userId: reservation.userId,
        wallet,
        currencyId: reservation.currencyId,
        amount: stake,
        typeCode: 'GAME_BET',
        statusCode: 'SETTLED',
        balanceBefore: Balance.total(this.loadState(wallet)),
        balanceAfter: Balance.total(state),
        idempotencyKey,
        reference: `${reference}:bet`,
        description: 'Game bet settled',
      });
      await this.postJournal(tx, {
        reference: `${reference}:bet`,
        currencyId: reservation.currencyId,
        walletTransactionId: betTxn.id,
        playerWalletId: wallet.id,
        houseWalletId,
        amount: stake,
        playerDirection: LedgerDirection.DEBIT,
      });

      if (Money.isPositive(win)) {
        const winTxn = await this.recordTxn(tx, {
          userId: reservation.userId,
          wallet,
          currencyId: reservation.currencyId,
          amount: win,
          typeCode: 'GAME_WIN',
          statusCode: 'SETTLED',
          balanceBefore: stake,
          balanceAfter: Balance.total(state),
          reference: `${reference}:win`,
          description: 'Game win credited',
        });
        await this.postJournal(tx, {
          reference: `${reference}:win`,
          currencyId: reservation.currencyId,
          walletTransactionId: winTxn.id,
          playerWalletId: wallet.id,
          houseWalletId,
          amount: win,
          playerDirection: LedgerDirection.CREDIT,
        });
      }

      return { transactionId: betTxn.id, reference: `${reference}:bet`, wallet: this.viewFrom(wallet, state) };
    });
  }

  /** Release a reservation back to available (cancel an unplayed bet). */
  async releaseReservation(reservationId: string, idempotencyKey?: string): Promise<MovementResult> {
    return this.run(async (tx) => {
      const reservation = await tx.lockedFunds.findUnique({ where: { id: reservationId } });
      if (!reservation) throw new NotFoundException('Reservation not found');
      const wallet = await this.lockWalletRow(tx, reservation.walletId);
      if (reservation.status !== 'LOCKED') {
        return { transactionId: '', reference: reservation.reason ?? '', wallet: this.viewFrom(wallet, this.loadState(wallet)) };
      }
      const amount = reservation.amount.toString();
      const state = this.loadState(wallet);
      const nextState = Balance.releaseReserved(state, amount);
      await this.writeBalance(tx, wallet.id, state.version, nextState);
      await tx.lockedFunds.update({ where: { id: reservationId }, data: { status: 'RELEASED', releasedAt: new Date() } });

      const txn = await this.recordTxn(tx, {
        userId: reservation.userId,
        wallet,
        currencyId: reservation.currencyId,
        amount,
        typeCode: 'RESERVE_RELEASE',
        statusCode: 'CANCELLED',
        balanceBefore: Balance.total(state),
        balanceAfter: Balance.total(nextState),
        idempotencyKey,
        reference: `${reservation.reason}:release`,
        description: 'Reservation released',
      });
      return { transactionId: txn.id, reference: txn.reference, wallet: this.viewFrom(wallet, nextState) };
    });
  }

  /** Transfer between two of a user's wallets (e.g. bonus → main). */
  async transfer(
    userId: string,
    currencyId: string,
    fromType: WalletType,
    toType: WalletType,
    amount: string,
    idempotencyKey?: string,
  ): Promise<{ from: WalletView; to: WalletView }> {
    this.assertPositive(amount);
    if (fromType === toType) throw new BadRequestException('Cannot transfer to the same wallet type');
    const fromWallet = await this.getOrCreateWallet(userId, currencyId, fromType);
    const toWallet = await this.getOrCreateWallet(userId, currencyId, toType);

    return this.lockMany([fromWallet.id, toWallet.id], () =>
      this.run(async (tx) => {
        const from = await this.lockWalletRow(tx, fromWallet.id);
        const to = await this.lockWalletRow(tx, toWallet.id);
        const fromState = this.loadState(from);
        const toState = this.loadState(to);
        const nextFrom = Balance.debit(fromState, amount);
        const nextTo = Balance.credit(toState, amount);
        await this.writeBalance(tx, from.id, fromState.version, nextFrom);
        await this.writeBalance(tx, to.id, toState.version, nextTo);

        const outTxn = await this.recordTxn(tx, {
          userId,
          wallet: from,
          currencyId,
          amount,
          typeCode: 'TRANSFER_OUT',
          statusCode: 'COMPLETED',
          balanceBefore: Balance.total(fromState),
          balanceAfter: Balance.total(nextFrom),
          idempotencyKey,
          description: `Transfer to ${toType}`,
        });
        await this.recordTxn(tx, {
          userId,
          wallet: to,
          currencyId,
          amount,
          typeCode: 'TRANSFER_IN',
          statusCode: 'COMPLETED',
          balanceBefore: Balance.total(toState),
          balanceAfter: Balance.total(nextTo),
          relatedTransactionId: outTxn.id,
          description: `Transfer from ${fromType}`,
        });
        await this.postJournal(tx, {
          reference: outTxn.reference,
          currencyId,
          walletTransactionId: outTxn.id,
          playerWalletId: from.id,
          houseWalletId: to.id,
          amount,
          playerDirection: LedgerDirection.DEBIT,
          counterpartyAccount: 'player',
        });
        return { from: this.viewFrom(from, nextFrom), to: this.viewFrom(to, nextTo) };
      }),
    );
  }

  async setStatus(walletId: string, status: WalletStatus): Promise<WalletView> {
    const wallet = await this.prisma.wallet.update({
      where: { id: walletId },
      data: { status },
      include: { balance: true },
    });
    await this.redis.del(this.cacheKey(wallet.id));
    return this.toView(wallet, wallet.balance);
  }

  freeze(walletId: string): Promise<WalletView> {
    return this.setStatus(walletId, WalletStatus.FROZEN);
  }

  unfreeze(walletId: string): Promise<WalletView> {
    return this.setStatus(walletId, WalletStatus.ACTIVE);
  }

  /** Reverse a completed transaction (admin rollback / correction). */
  async rollback(transactionId: string, idempotencyKey?: string): Promise<MovementResult> {
    return this.run(async (tx) => {
      const original = await tx.walletTransaction.findUnique({ where: { id: transactionId } });
      if (!original) throw new NotFoundException('Transaction not found');
      const wallet = await this.lockWalletRow(tx, original.walletId);
      const amount = original.amount.toString();
      const state = this.loadState(wallet);
      // Reverse direction: a debit is credited back and vice versa.
      const wasDebit = Money.lt(original.balanceAfter.toString(), original.balanceBefore.toString());
      const nextState = wasDebit ? Balance.credit(state, amount) : Balance.debit(state, amount);
      await this.writeBalance(tx, wallet.id, state.version, nextState);

      const txn = await this.recordTxn(tx, {
        userId: original.userId,
        wallet,
        currencyId: original.currencyId,
        amount,
        typeCode: 'ROLLBACK',
        statusCode: 'REVERSED',
        balanceBefore: Balance.total(state),
        balanceAfter: Balance.total(nextState),
        relatedTransactionId: original.id,
        idempotencyKey,
        description: `Rollback of ${original.reference}`,
      });
      return { transactionId: txn.id, reference: txn.reference, wallet: this.viewFrom(wallet, nextState) };
    });
  }

  // ---- Atomic primitives ---------------------------------------------------

  private async applyAvailableDelta(
    userId: string,
    currencyId: string,
    type: WalletType,
    input: MutationInput,
    op: 'credit' | 'debit',
  ): Promise<MovementResult> {
    this.assertPositive(input.amount);
    return this.withWallet(userId, currencyId, type, async (tx, wallet) => {
      if (input.idempotencyKey) {
        const existing = await this.replay(tx, input.idempotencyKey);
        if (existing) return this.movementFrom(tx, existing);
      }
      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new ConflictException(`Wallet is ${wallet.status.toLowerCase()}`);
      }
      const state = this.loadState(wallet);
      const nextState = op === 'credit' ? Balance.credit(state, input.amount) : Balance.debit(state, input.amount);
      await this.writeBalance(tx, wallet.id, state.version, nextState);

      const houseWalletId = await this.system.houseWallet(currencyId, tx);
      const txn = await this.recordTxn(tx, {
        userId,
        wallet,
        currencyId,
        amount: input.amount,
        typeCode: input.typeCode,
        statusCode: 'COMPLETED',
        balanceBefore: Balance.total(state),
        balanceAfter: Balance.total(nextState),
        idempotencyKey: input.idempotencyKey,
        reference: input.reference,
        description: input.description,
        metadata: input.metadata,
      });
      await this.postJournal(tx, {
        reference: txn.reference,
        currencyId,
        walletTransactionId: txn.id,
        playerWalletId: wallet.id,
        houseWalletId,
        amount: input.amount,
        playerDirection: op === 'credit' ? LedgerDirection.CREDIT : LedgerDirection.DEBIT,
      });
      return { transactionId: txn.id, reference: txn.reference, wallet: this.viewFrom(wallet, nextState) };
    });
  }

  /** Run a function inside a DB transaction with bounded optimistic retries. */
  private async run<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        return await this.prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        lastError = error;
        if (!this.isRetryable(error)) throw error;
      }
    }
    throw new ConflictException('Wallet operation failed after contention retries', { cause: lastError as Error });
  }

  private async withWallet<T>(
    userId: string,
    currencyId: string,
    type: WalletType,
    fn: (tx: Prisma.TransactionClient, wallet: WalletWithBalance) => Promise<T>,
  ): Promise<T> {
    const view = await this.getOrCreateWallet(userId, currencyId, type);
    return this.lockMany([view.id], () =>
      this.run(async (tx) => {
        const wallet = await this.lockWalletRow(tx, view.id);
        return fn(tx, wallet);
      }),
    );
  }

  private async lockWalletRow(tx: Prisma.TransactionClient, walletId: string): Promise<WalletWithBalance> {
    const wallet = await tx.wallet.findUnique({ where: { id: walletId }, include: { balance: true } });
    if (!wallet || !wallet.balance) throw new NotFoundException('Wallet not found');
    return wallet as WalletWithBalance;
  }

  private async writeBalance(
    tx: Prisma.TransactionClient,
    walletId: string,
    expectedVersion: number,
    state: BalanceState,
  ): Promise<void> {
    const updated = await tx.walletBalance.updateMany({
      where: { walletId, version: expectedVersion },
      data: {
        available: state.available,
        locked: state.locked,
        pending: state.pending,
        total: Balance.total(state),
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      throw new ConflictException('Concurrent wallet modification detected (version conflict)');
    }
    await this.redis.del(this.cacheKey(walletId));
  }

  private async recordTxn(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      wallet: { id: string };
      currencyId: string;
      amount: string;
      typeCode: TransactionTypeCode;
      statusCode: string;
      balanceBefore: string;
      balanceAfter: string;
      idempotencyKey?: string;
      reference?: string;
      relatedTransactionId?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const typeId = await this.ensureType(tx, input.typeCode);
    const statusId = await this.ensureStatus(tx, input.statusCode);
    return tx.walletTransaction.create({
      data: {
        userId: input.userId,
        walletId: input.wallet.id,
        currencyId: input.currencyId,
        typeId,
        statusId,
        reference: input.reference ?? `txn-${randomUUID()}`,
        idempotencyKey: input.idempotencyKey,
        amount: input.amount,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
        description: input.description,
        relatedTransactionId: input.relatedTransactionId,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async postJournal(
    tx: Prisma.TransactionClient,
    input: {
      reference: string;
      currencyId: string;
      walletTransactionId: string;
      playerWalletId: string;
      houseWalletId: string;
      amount: string;
      playerDirection: LedgerDirection;
      counterpartyAccount?: 'house' | 'player';
    },
  ): Promise<void> {
    const counterDirection =
      input.playerDirection === LedgerDirection.DEBIT ? LedgerDirection.CREDIT : LedgerDirection.DEBIT;
    await tx.ledger.create({
      data: {
        reference: `ldg-${input.reference}`,
        walletTransactionId: input.walletTransactionId,
        currencyId: input.currencyId,
        status: 'POSTED',
        entries: {
          create: [
            { walletId: input.playerWalletId, currencyId: input.currencyId, direction: input.playerDirection, amount: input.amount, status: 'POSTED' },
            { walletId: input.houseWalletId, currencyId: input.currencyId, direction: counterDirection, amount: input.amount, status: 'POSTED' },
          ],
        },
      },
    });
  }

  private async ensureType(tx: Prisma.TransactionClient, code: string): Promise<string> {
    const cached = this.typeIds.get(code);
    if (cached) return cached;
    const row = await tx.transactionType.upsert({
      where: { code },
      update: {},
      create: { code, name: code.replace(/_/g, ' ') },
      select: { id: true },
    });
    this.typeIds.set(code, row.id);
    return row.id;
  }

  private async ensureStatus(tx: Prisma.TransactionClient, code: string): Promise<string> {
    const cached = this.statusIds.get(code);
    if (cached) return cached;
    const isFinal = ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REVERSED', 'REFUNDED', 'SETTLED'].includes(code);
    const row = await tx.transactionStatus.upsert({
      where: { code },
      update: {},
      create: { code, name: code, isFinal },
      select: { id: true },
    });
    this.statusIds.set(code, row.id);
    return row.id;
  }

  private async replay(tx: Prisma.TransactionClient, idempotencyKey: string) {
    return tx.walletTransaction.findUnique({ where: { idempotencyKey } });
  }

  private async movementFrom(
    tx: Prisma.TransactionClient,
    txn: { id: string; reference: string; walletId: string },
  ): Promise<MovementResult> {
    return { transactionId: txn.id, reference: txn.reference, wallet: await this.reloadView(tx, txn.walletId) };
  }

  private async reloadView(tx: Prisma.TransactionClient, walletId: string): Promise<WalletView> {
    const wallet = await this.lockWalletRow(tx, walletId);
    return this.toView(wallet, wallet.balance);
  }

  // ---- Redis locking -------------------------------------------------------

  private async lockMany<T>(walletIds: string[], fn: () => Promise<T>): Promise<T> {
    const ordered = [...new Set(walletIds)].sort();
    const tokens: Array<{ key: string; token: string }> = [];
    try {
      for (const id of ordered) {
        const key = `wallet:lock:${id}`;
        const token = randomUUID();
        await this.acquireLock(key, token);
        tokens.push({ key, token });
      }
      return await fn();
    } finally {
      for (const { key, token } of tokens.reverse()) await this.releaseLock(key, token);
    }
  }

  private async acquireLock(key: string, token: string): Promise<void> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const ok = await this.redis.raw.set(key, token, 'PX', LOCK_TTL_MS, 'NX');
      if (ok === 'OK') return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new ConflictException('Could not acquire wallet lock');
  }

  private async releaseLock(key: string, token: string): Promise<void> {
    const current = await this.redis.get<string>(key);
    if (current === token) await this.redis.del(key);
  }

  // ---- Mapping helpers -----------------------------------------------------

  private isRetryable(error: unknown): boolean {
    if (error instanceof ConflictException) return true;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === 'P2034' || error.code === 'P2002'; // write conflict / unique race
    }
    return false;
  }

  private assertPositive(amount: string): void {
    if (!Money.isPositive(amount)) throw new BadRequestException('Amount must be positive');
  }

  private loadState(wallet: WalletWithBalance): BalanceState {
    return {
      available: wallet.balance.available.toString(),
      locked: wallet.balance.locked.toString(),
      pending: wallet.balance.pending.toString(),
      version: wallet.balance.version,
    };
  }

  private viewFrom(wallet: { id: string; userId: string; currencyId: string; type: WalletType; status: WalletStatus }, state: BalanceState): WalletView {
    return {
      id: wallet.id,
      userId: wallet.userId,
      currencyId: wallet.currencyId,
      type: wallet.type,
      status: wallet.status,
      available: state.available,
      locked: state.locked,
      pending: state.pending,
      total: Balance.total(state),
      version: state.version + 1,
    };
  }

  private toView(
    wallet: { id: string; userId: string; currencyId: string; type: WalletType; status: WalletStatus },
    balance: { available: Prisma.Decimal; locked: Prisma.Decimal; pending: Prisma.Decimal; total: Prisma.Decimal; version: number } | null,
  ): WalletView {
    return {
      id: wallet.id,
      userId: wallet.userId,
      currencyId: wallet.currencyId,
      type: wallet.type,
      status: wallet.status,
      available: balance?.available.toString() ?? '0',
      locked: balance?.locked.toString() ?? '0',
      pending: balance?.pending.toString() ?? '0',
      total: balance?.total.toString() ?? '0',
      version: balance?.version ?? 0,
    };
  }

  private cacheKey(walletId: string): string {
    return `wallet:balance:${walletId}`;
  }
}

type WalletWithBalance = {
  id: string;
  userId: string;
  currencyId: string;
  type: WalletType;
  status: WalletStatus;
  balance: { available: Prisma.Decimal; locked: Prisma.Decimal; pending: Prisma.Decimal; total: Prisma.Decimal; version: number };
};
