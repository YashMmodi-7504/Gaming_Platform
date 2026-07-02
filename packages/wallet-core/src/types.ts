/**
 * Wallet domain vocabulary. These mirror the database enums and lookup codes but
 * live here as the engine's pure, reusable source of truth.
 */

export type WalletType =
  | 'MAIN'
  | 'BONUS'
  | 'REWARD'
  | 'LOCKED'
  | 'TOURNAMENT'
  | 'PROMOTIONAL'
  | 'CASH'
  | 'VIRTUAL';

export const WALLET_TYPES: WalletType[] = [
  'MAIN',
  'BONUS',
  'REWARD',
  'LOCKED',
  'TOURNAMENT',
  'PROMOTIONAL',
  'CASH',
  'VIRTUAL',
];

export type WalletStatus = 'ACTIVE' | 'FROZEN' | 'SUSPENDED' | 'CLOSED';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

/** Transaction type codes (the lookup-table `code` values). */
export type TransactionTypeCode =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'GAME_BET'
  | 'GAME_WIN'
  | 'REFUND'
  | 'ROLLBACK'
  | 'ADJUSTMENT'
  | 'BONUS_CREDIT'
  | 'BONUS_DEBIT'
  | 'REFERRAL_REWARD'
  | 'TOURNAMENT_PRIZE'
  | 'CASHBACK'
  | 'PROMOTION_REWARD'
  | 'PENALTY'
  | 'ADMIN_ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'LOCK'
  | 'UNLOCK'
  | 'RESERVE'
  | 'RESERVE_RELEASE';

export const TRANSACTION_TYPE_CODES: TransactionTypeCode[] = [
  'DEPOSIT',
  'WITHDRAWAL',
  'GAME_BET',
  'GAME_WIN',
  'REFUND',
  'ROLLBACK',
  'ADJUSTMENT',
  'BONUS_CREDIT',
  'BONUS_DEBIT',
  'REFERRAL_REWARD',
  'TOURNAMENT_PRIZE',
  'CASHBACK',
  'PROMOTION_REWARD',
  'PENALTY',
  'ADMIN_ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'LOCK',
  'UNLOCK',
  'RESERVE',
  'RESERVE_RELEASE',
];

/** Whether a transaction type credits (+) or debits (−) available balance. */
export const TRANSACTION_DIRECTION: Record<TransactionTypeCode, LedgerDirection> = {
  DEPOSIT: 'CREDIT',
  WITHDRAWAL: 'DEBIT',
  GAME_BET: 'DEBIT',
  GAME_WIN: 'CREDIT',
  REFUND: 'CREDIT',
  ROLLBACK: 'CREDIT',
  ADJUSTMENT: 'CREDIT',
  BONUS_CREDIT: 'CREDIT',
  BONUS_DEBIT: 'DEBIT',
  REFERRAL_REWARD: 'CREDIT',
  TOURNAMENT_PRIZE: 'CREDIT',
  CASHBACK: 'CREDIT',
  PROMOTION_REWARD: 'CREDIT',
  PENALTY: 'DEBIT',
  ADMIN_ADJUSTMENT: 'CREDIT',
  TRANSFER_IN: 'CREDIT',
  TRANSFER_OUT: 'DEBIT',
  LOCK: 'DEBIT',
  UNLOCK: 'CREDIT',
  RESERVE: 'DEBIT',
  RESERVE_RELEASE: 'CREDIT',
};

export type TransactionStatusCode =
  | 'PENDING'
  | 'RESERVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REVERSED'
  | 'REFUNDED'
  | 'SETTLED';

export const TRANSACTION_STATUS_CODES: TransactionStatusCode[] = [
  'PENDING',
  'RESERVED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REVERSED',
  'REFUNDED',
  'SETTLED',
];

/** Terminal statuses cannot transition further. */
export const FINAL_STATUSES: TransactionStatusCode[] = [
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REVERSED',
  'REFUNDED',
  'SETTLED',
];
