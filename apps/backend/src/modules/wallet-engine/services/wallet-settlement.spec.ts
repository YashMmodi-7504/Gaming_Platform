import { Balance, Money, WalletLedgerEngine } from '@gaming-platform/wallet-core';

/**
 * Locks the financial semantics the backend Wallet Engine guarantees, exercised
 * against the wallet-core reference aggregate (the same algebra the Prisma-backed
 * engine mirrors). Proves reserve → commit/release conserve the books exactly.
 */
describe('Wallet settlement semantics', () => {
  it('reserves a stake then settles a win, conserving the ledger', () => {
    const engine = new WalletLedgerEngine();
    engine.open('player', '100');
    const reservation = engine.reserve('player', '10', 'round-1');
    const result = engine.commit(reservation, '25');
    expect(result.net).toBe('15');
    expect(engine.balance('player').available).toBe('115');
    expect(engine.isConserved()).toBe(true);
    expect(engine.ledgerBalanced()).toBe(true);
  });

  it('refunds a released (cancelled) round', () => {
    const engine = new WalletLedgerEngine();
    engine.open('player', '50');
    const reservation = engine.reserve('player', '20', 'round-2');
    expect(engine.balance('player').available).toBe('30');
    engine.release(reservation);
    expect(engine.balance('player').available).toBe('50');
    expect(engine.isConserved()).toBe(true);
  });

  it('never permits an overdraft', () => {
    const engine = new WalletLedgerEngine();
    engine.open('player', '5');
    expect(() => engine.reserve('player', '10', 'round-3')).toThrow();
    expect(Money.gte(Balance.total(engine.balance('player')), '0')).toBe(true);
  });
});
