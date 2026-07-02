import { Balance, emptyBalance, type BalanceState } from './balance';
import { Ledger, type LedgerEntryDraft } from './ledger';
import { Money, formatMoney, parseMoney } from './money';
import { ReservationState, type Reservation } from './reservation';

const HOUSE = '__house__';
const EXTERNAL = '__external__';

export interface SettleResult {
  reservationId: string;
  stake: Money;
  win: Money;
  net: Money;
  balance: BalanceState;
}

/**
 * An in-memory, atomic wallet ledger aggregate — the reference implementation of
 * the engine's money invariants and the basis for its property tests. Player
 * wallets can never go negative (enforced by {@link Balance}); system accounts
 * (house, external) are signed. Every committed movement posts a balanced
 * double-entry journal, so the books are always conserved:
 *
 *   Σ player balances + Σ system accounts ≡ 0
 *
 * The backend mirrors these operations onto Postgres with optimistic locking and
 * Redis locks; this class proves the algebra is corruption-free.
 */
export class WalletLedgerEngine {
  private readonly wallets = new Map<string, BalanceState>();
  private readonly system = new Map<string, bigint>([
    [HOUSE, 0n],
    [EXTERNAL, 0n],
  ]);
  private readonly reservations = new Map<string, Reservation>();
  private readonly journals: LedgerEntryDraft[][] = [];
  private readonly processed = new Map<string, unknown>();
  private seq = 0;

  open(walletRef: string, opening: Money = Money.ZERO): BalanceState {
    if (!this.wallets.has(walletRef)) {
      let state = emptyBalance();
      if (Money.isPositive(opening)) {
        state = Balance.credit(state, opening);
        this.systemAdd(EXTERNAL, Money.neg(opening));
        this.post([entry('player', walletRef, 'CREDIT', opening), entry('external', EXTERNAL, 'DEBIT', opening)]);
      }
      this.wallets.set(walletRef, state);
    }
    return this.balance(walletRef);
  }

  balance(walletRef: string): BalanceState {
    return this.wallets.get(walletRef) ?? emptyBalance();
  }

  /** Idempotent wrapper — replays the stored result for a known key. */
  private idempotent<T>(key: string | undefined, fn: () => T): T {
    if (key && this.processed.has(key)) return this.processed.get(key) as T;
    const result = fn();
    if (key) this.processed.set(key, result);
    return result;
  }

  credit(walletRef: string, amount: Money, key?: string): BalanceState {
    return this.idempotent(key, () => {
      const state = Balance.credit(this.open(walletRef), amount);
      this.wallets.set(walletRef, state);
      this.systemAdd(EXTERNAL, Money.neg(amount));
      this.post([entry('player', walletRef, 'CREDIT', amount), entry('external', EXTERNAL, 'DEBIT', amount)]);
      return state;
    });
  }

  debit(walletRef: string, amount: Money, key?: string): BalanceState {
    return this.idempotent(key, () => {
      const state = Balance.debit(this.open(walletRef), amount);
      this.wallets.set(walletRef, state);
      this.systemAdd(EXTERNAL, amount);
      this.post([entry('player', walletRef, 'DEBIT', amount), entry('external', EXTERNAL, 'CREDIT', amount)]);
      return state;
    });
  }

  /** Reserve a stake (available → locked). Returns the reservation id. */
  reserve(walletRef: string, amount: Money, reference: string, key?: string): string {
    return this.idempotent(key, () => {
      const state = Balance.reserve(this.open(walletRef), amount);
      this.wallets.set(walletRef, state);
      const id = `rsv-${(this.seq += 1)}`;
      this.reservations.set(id, { id, walletRef, amount, status: 'RESERVED', reference });
      return id;
    });
  }

  /** Commit a reservation: consume the stake and credit any winnings. */
  commit(reservationId: string, win: Money = Money.ZERO, key?: string): SettleResult {
    return this.idempotent(key ?? `commit:${reservationId}`, () => {
      const reservation = this.requireReservation(reservationId);
      ReservationState.assert(reservation.status, 'COMMITTED');
      const stake = reservation.amount;

      // Stake leaves the player → house.
      let state = Balance.commitReserved(this.balance(reservation.walletRef), stake);
      this.systemAdd(HOUSE, stake);
      this.post([entry('player', reservation.walletRef, 'DEBIT', stake), entry('house', HOUSE, 'CREDIT', stake)]);

      // Winnings flow house → player.
      if (Money.isPositive(win)) {
        state = Balance.credit(state, win);
        this.systemAdd(HOUSE, Money.neg(win));
        this.post([entry('house', HOUSE, 'DEBIT', win), entry('player', reservation.walletRef, 'CREDIT', win)]);
      }

      this.wallets.set(reservation.walletRef, state);
      reservation.status = 'COMMITTED';
      return { reservationId, stake, win, net: Money.sub(win, stake), balance: state };
    });
  }

  /** Release a reservation back to available (cancel an unplayed bet). */
  release(reservationId: string, key?: string): BalanceState {
    return this.idempotent(key ?? `release:${reservationId}`, () => {
      const reservation = this.requireReservation(reservationId);
      ReservationState.assert(reservation.status, 'RELEASED');
      const state = Balance.releaseReserved(this.balance(reservation.walletRef), reservation.amount);
      this.wallets.set(reservation.walletRef, state);
      reservation.status = 'RELEASED';
      return state;
    });
  }

  /** Atomic player-to-player transfer. */
  transfer(fromRef: string, toRef: string, amount: Money, key?: string): void {
    this.idempotent(key, () => {
      if (fromRef === toRef) throw new Error('Cannot transfer to the same wallet');
      // Debit first and persist so the credit reads post-debit state.
      this.wallets.set(fromRef, Balance.debit(this.open(fromRef), amount));
      this.wallets.set(toRef, Balance.credit(this.open(toRef), amount));
      this.post([entry('player', fromRef, 'DEBIT', amount), entry('player', toRef, 'CREDIT', amount)]);
      return true;
    });
  }

  // ---- Invariant inspection (used by tests) --------------------------------

  /** Net of all accounts; must always be exactly zero (double-entry conserved). */
  globalNet(): Money {
    let net = 0n;
    for (const state of this.wallets.values()) net += parseMoney(Balance.total(state));
    for (const value of this.system.values()) net += value;
    return formatMoney(net);
  }

  isConserved(): boolean {
    let net = 0n;
    for (const state of this.wallets.values()) net += parseMoney(Balance.total(state));
    for (const value of this.system.values()) net += value;
    return net === 0n;
  }

  /** Verify every posted journal is internally balanced. */
  ledgerBalanced(): boolean {
    return this.journals.every((entries) => {
      try {
        Ledger.assertBalanced(entries);
        return true;
      } catch {
        return false;
      }
    });
  }

  get journalCount(): number {
    return this.journals.length;
  }

  private requireReservation(id: string): Reservation {
    const reservation = this.reservations.get(id);
    if (!reservation) throw new Error(`Unknown reservation "${id}"`);
    return reservation;
  }

  private systemAdd(account: string, amount: Money): void {
    this.system.set(account, (this.system.get(account) ?? 0n) + parseMoney(amount));
  }

  private post(entries: LedgerEntryDraft[]): void {
    Ledger.assertBalanced(entries);
    this.journals.push(entries);
  }
}

function entry(
  account: LedgerEntryDraft['account'],
  walletRef: string,
  direction: LedgerEntryDraft['direction'],
  amount: Money,
): LedgerEntryDraft {
  return { account, walletRef, direction, amount };
}
