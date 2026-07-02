/**
 * @gaming-platform/wallet-core
 *
 * The pure, exact-arithmetic domain core of the Enterprise Wallet & Financial
 * Engine: money maths (bigint fixed-point), balance algebra (reserve / commit /
 * release with non-negative guarantees), a double-entry ledger builder, the
 * transaction lifecycle state machine, reservations and an in-memory atomic
 * aggregate that proves the books are always conserved.
 *
 * The backend `wallet-engine` module mirrors these operations onto Postgres with
 * optimistic locking, Redis locks and idempotency keys.
 */

export * from './money';
export * from './types';
export * from './lifecycle';
export * from './balance';
export * from './ledger';
export * from './reservation';
export * from './engine';
