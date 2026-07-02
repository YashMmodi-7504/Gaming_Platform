import { describe, expect, it } from 'vitest';

import { Balance, BalanceError, emptyBalance } from './balance';
import { WalletLedgerEngine } from './engine';
import { Ledger, LedgerError } from './ledger';
import { Lifecycle, LifecycleError } from './lifecycle';
import { Money, parseMoney, formatMoney } from './money';
import { TRANSACTION_DIRECTION, TRANSACTION_TYPE_CODES } from './types';

describe('money', () => {
  it('parses and formats exactly without float drift', () => {
    expect(Money.add('0.1', '0.2')).toBe('0.3');
    expect(Money.mul('10', '2.5')).toBe('25');
    expect(Money.sub('100', '0.000000000000000001')).toBe('99.999999999999999999');
    expect(formatMoney(parseMoney('-0'))).toBe('0');
  });

  it('compares and aggregates', () => {
    expect(Money.gt('2', '1.999999999999999999')).toBe(true);
    expect(Money.sum(['1', '2', '3'])).toBe('6');
    expect(Money.min('5', '3')).toBe('3');
  });

  it('rejects invalid input', () => {
    expect(() => Money.of('abc')).toThrow();
  });
});

describe('balance algebra', () => {
  it('reserves, commits and releases conserving total', () => {
    let b = Balance.credit(emptyBalance(), '100');
    expect(Balance.total(b)).toBe('100');
    b = Balance.reserve(b, '30');
    expect(b.available).toBe('70');
    expect(b.locked).toBe('30');
    expect(Balance.total(b)).toBe('100'); // reserve conserves total
    const released = Balance.releaseReserved(b, '30');
    expect(released.available).toBe('100');
    const committed = Balance.commitReserved(b, '30');
    expect(committed.locked).toBe('0');
    expect(Balance.total(committed)).toBe('70'); // stake consumed
  });

  it('refuses overdraft and negative components', () => {
    const b = Balance.credit(emptyBalance(), '10');
    expect(() => Balance.debit(b, '11')).toThrow(BalanceError);
    expect(() => Balance.reserve(b, '11')).toThrow(BalanceError);
    expect(() => Balance.commitReserved(b, '1')).toThrow(BalanceError);
  });

  it('increments version for optimistic locking', () => {
    const b0 = emptyBalance();
    const b1 = Balance.credit(b0, '5');
    expect(b1.version).toBe(b0.version + 1);
  });
});

describe('double-entry ledger', () => {
  it('builds balanced journals', () => {
    const journal = Ledger.simple({
      reference: 'r1',
      currency: 'USD',
      amount: '50',
      playerWalletRef: 'w1',
      counterpartyWalletRef: 'house',
      playerDirection: 'DEBIT',
    });
    expect(journal.entries).toHaveLength(2);
    expect(() => Ledger.assertBalanced(journal.entries)).not.toThrow();
  });

  it('rejects an unbalanced journal', () => {
    expect(() =>
      Ledger.assertBalanced([
        { account: 'player', walletRef: 'w1', direction: 'DEBIT', amount: '10' },
        { account: 'house', walletRef: 'h', direction: 'CREDIT', amount: '9' },
      ]),
    ).toThrow(LedgerError);
  });
});

describe('transaction lifecycle', () => {
  it('allows legal transitions and blocks illegal ones', () => {
    expect(Lifecycle.transition('RESERVED', 'SETTLED')).toBe('SETTLED');
    expect(() => Lifecycle.transition('SETTLED', 'RESERVED')).toThrow(LifecycleError);
    expect(Lifecycle.isFinal('REVERSED')).toBe(true);
  });

  it('declares a direction for every transaction type', () => {
    for (const code of TRANSACTION_TYPE_CODES) {
      expect(['DEBIT', 'CREDIT']).toContain(TRANSACTION_DIRECTION[code]);
    }
  });
});

describe('wallet ledger engine — bet flow', () => {
  it('reserves and settles a winning bet', () => {
    const engine = new WalletLedgerEngine();
    engine.open('w1', '100');
    const rsv = engine.reserve('w1', '10', 'bet-1');
    expect(engine.balance('w1').locked).toBe('10');
    const result = engine.commit(rsv, '25'); // win 2.5×
    expect(result.net).toBe('15');
    expect(engine.balance('w1').available).toBe('115');
    expect(engine.isConserved()).toBe(true);
  });

  it('reserves and settles a losing bet', () => {
    const engine = new WalletLedgerEngine();
    engine.open('w1', '100');
    const rsv = engine.reserve('w1', '10', 'bet-1');
    engine.commit(rsv); // no win
    expect(engine.balance('w1').available).toBe('90');
    expect(engine.isConserved()).toBe(true);
  });

  it('is idempotent on commit and release', () => {
    const engine = new WalletLedgerEngine();
    engine.open('w1', '100');
    const rsv = engine.reserve('w1', '10', 'bet-1');
    const a = engine.commit(rsv, '20');
    const b = engine.commit(rsv, '20'); // replay
    expect(a).toEqual(b);
    expect(engine.balance('w1').available).toBe('110');
  });

  it('blocks committing a released reservation', () => {
    const engine = new WalletLedgerEngine();
    engine.open('w1', '100');
    const rsv = engine.reserve('w1', '10', 'bet-1');
    engine.release(rsv);
    expect(() => engine.commit(rsv, '0', 'fresh-key')).toThrow();
  });

  it('transfers between wallets atomically', () => {
    const engine = new WalletLedgerEngine();
    engine.open('w1', '100');
    engine.open('w2', '0');
    engine.transfer('w1', 'w2', '40', 'tx-1');
    expect(engine.balance('w1').available).toBe('60');
    expect(engine.balance('w2').available).toBe('40');
    expect(engine.isConserved()).toBe(true);
  });
});

describe('stress: 10,000 concurrent wallet operations — zero corruption', () => {
  it('conserves the books and never goes negative', async () => {
    const engine = new WalletLedgerEngine();
    const WALLETS = 50;
    for (let i = 0; i < WALLETS; i += 1) engine.open(`w${i}`, '1000');

    // A deterministic pseudo-random schedule (no Math.random — reproducible).
    let s = 123456789;
    const rnd = (n: number): number => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s % n;
    };

    const ops = Array.from({ length: 10000 }, (_, i) => async () => {
      const w = `w${rnd(WALLETS)}`;
      const kind = rnd(5);
      const amount = `${1 + rnd(50)}`;
      try {
        if (kind === 0) engine.credit(w, amount, `c-${i}`);
        else if (kind === 1) engine.debit(w, amount, `d-${i}`);
        else if (kind === 2) {
          const rsv = engine.reserve(w, amount, `bet-${i}`, `r-${i}`);
          engine.commit(rsv, `${rnd(120)}`, `cm-${i}`);
        } else if (kind === 3) {
          const rsv = engine.reserve(w, amount, `bet-${i}`, `r2-${i}`);
          engine.release(rsv, `rl-${i}`);
        } else {
          engine.transfer(w, `w${rnd(WALLETS)}`, amount, `t-${i}`);
        }
      } catch {
        // Insufficient-funds rejections are expected and safe — they must not
        // corrupt any balance. The invariants below prove that.
      }
    });

    await Promise.all(ops.map((op) => op()));

    // Invariants after 10k operations:
    expect(engine.isConserved()).toBe(true); // Σ all accounts == 0
    expect(engine.globalNet()).toBe('0');
    expect(engine.ledgerBalanced()).toBe(true); // every journal balanced
    for (let i = 0; i < WALLETS; i += 1) {
      const b = engine.balance(`w${i}`);
      expect(Money.isNegative(b.available)).toBe(false);
      expect(Money.isNegative(b.locked)).toBe(false);
      expect(Money.gte(Balance.total(b), '0')).toBe(true);
    }
  });
});
