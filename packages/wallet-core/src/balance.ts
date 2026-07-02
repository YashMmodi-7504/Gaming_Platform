import { Money } from './money';

export interface BalanceState {
  available: Money;
  locked: Money;
  pending: Money;
  version: number;
}

export class BalanceError extends Error {}

/** A fresh zero balance. */
export function emptyBalance(): BalanceState {
  return { available: Money.ZERO, locked: Money.ZERO, pending: Money.ZERO, version: 0 };
}

function next(state: BalanceState, patch: Partial<Omit<BalanceState, 'version'>>): BalanceState {
  const result: BalanceState = {
    available: patch.available ?? state.available,
    locked: patch.locked ?? state.locked,
    pending: patch.pending ?? state.pending,
    version: state.version + 1,
  };
  if (Money.isNegative(result.available)) throw new BalanceError('Available balance cannot be negative');
  if (Money.isNegative(result.locked)) throw new BalanceError('Locked balance cannot be negative');
  if (Money.isNegative(result.pending)) throw new BalanceError('Pending balance cannot be negative');
  return result;
}

/**
 * Pure balance algebra. Every operation returns a new immutable state with an
 * incremented version (for optimistic locking) and rejects any move that would
 * drive a component negative — the structural guarantee against overdrafts and
 * balance corruption.
 *
 * Invariant: `total = available + locked + pending` is conserved by transfers
 * between components (reserve/release) and changed only by external credit/debit.
 */
export const Balance = {
  total(state: BalanceState): Money {
    return Money.sum([state.available, state.locked, state.pending]);
  },

  /** Add funds to available (deposit, win, refund, transfer-in). */
  credit(state: BalanceState, amount: Money): BalanceState {
    assertPositive(amount);
    return next(state, { available: Money.add(state.available, amount) });
  },

  /** Remove funds from available (withdrawal, transfer-out). Requires funds. */
  debit(state: BalanceState, amount: Money): BalanceState {
    assertPositive(amount);
    if (Money.lt(state.available, amount)) {
      throw new BalanceError('Insufficient available balance');
    }
    return next(state, { available: Money.sub(state.available, amount) });
  },

  /** Move funds available → locked (reserve a stake). */
  reserve(state: BalanceState, amount: Money): BalanceState {
    assertPositive(amount);
    if (Money.lt(state.available, amount)) {
      throw new BalanceError('Insufficient available balance to reserve');
    }
    return next(state, {
      available: Money.sub(state.available, amount),
      locked: Money.add(state.locked, amount),
    });
  },

  /** Consume reserved funds (the stake leaves the wallet). */
  commitReserved(state: BalanceState, amount: Money): BalanceState {
    assertPositive(amount);
    if (Money.lt(state.locked, amount)) {
      throw new BalanceError('Insufficient locked balance to commit');
    }
    return next(state, { locked: Money.sub(state.locked, amount) });
  },

  /** Return reserved funds to available (cancel a reservation). */
  releaseReserved(state: BalanceState, amount: Money): BalanceState {
    assertPositive(amount);
    if (Money.lt(state.locked, amount)) {
      throw new BalanceError('Insufficient locked balance to release');
    }
    return next(state, {
      locked: Money.sub(state.locked, amount),
      available: Money.add(state.available, amount),
    });
  },

  /** Add to pending (an initiated deposit awaiting confirmation). */
  addPending(state: BalanceState, amount: Money): BalanceState {
    assertPositive(amount);
    return next(state, { pending: Money.add(state.pending, amount) });
  },

  /** Clear pending into available (deposit confirmed). */
  settlePending(state: BalanceState, amount: Money): BalanceState {
    assertPositive(amount);
    if (Money.lt(state.pending, amount)) throw new BalanceError('Insufficient pending balance');
    return next(state, {
      pending: Money.sub(state.pending, amount),
      available: Money.add(state.available, amount),
    });
  },

  /** Drop pending without crediting (deposit failed). */
  dropPending(state: BalanceState, amount: Money): BalanceState {
    assertPositive(amount);
    if (Money.lt(state.pending, amount)) throw new BalanceError('Insufficient pending balance');
    return next(state, { pending: Money.sub(state.pending, amount) });
  },
};

function assertPositive(amount: Money): void {
  if (!Money.isPositive(amount)) throw new BalanceError('Amount must be positive');
}
