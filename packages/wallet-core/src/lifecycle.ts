import { FINAL_STATUSES, type TransactionStatusCode } from './types';

/**
 * The transaction lifecycle state machine. Only the declared transitions are
 * legal; everything else throws. This prevents illegal settlements (e.g.
 * committing an already-reversed transaction) and double-processing.
 */
export const TRANSITIONS: Record<TransactionStatusCode, TransactionStatusCode[]> = {
  PENDING: ['RESERVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
  RESERVED: ['PROCESSING', 'COMPLETED', 'SETTLED', 'CANCELLED', 'EXPIRED', 'FAILED'],
  PROCESSING: ['COMPLETED', 'SETTLED', 'FAILED', 'REVERSED'],
  COMPLETED: ['REVERSED', 'REFUNDED'],
  SETTLED: ['REVERSED', 'REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
  REVERSED: [],
  REFUNDED: [],
};

export class LifecycleError extends Error {}

export const Lifecycle = {
  isFinal(status: TransactionStatusCode): boolean {
    return FINAL_STATUSES.includes(status);
  },

  canTransition(from: TransactionStatusCode, to: TransactionStatusCode): boolean {
    return TRANSITIONS[from].includes(to);
  },

  /** Assert a transition is legal, returning the next status. */
  transition(from: TransactionStatusCode, to: TransactionStatusCode): TransactionStatusCode {
    if (!Lifecycle.canTransition(from, to)) {
      throw new LifecycleError(`Illegal transaction transition ${from} → ${to}`);
    }
    return to;
  },
};
