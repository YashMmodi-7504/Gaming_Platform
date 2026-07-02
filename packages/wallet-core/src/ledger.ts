import { Money } from './money';
import type { LedgerDirection } from './types';

/** A single side of a balanced journal entry. */
export interface LedgerEntryDraft {
  /** Logical account: the player wallet or a system counterparty. */
  account: 'player' | 'house' | 'external' | 'bonus' | 'reward' | 'locked';
  /** Opaque reference to the concrete wallet row (resolved by the backend). */
  walletRef: string;
  direction: LedgerDirection;
  amount: Money;
}

export interface Journal {
  reference: string;
  currency: string;
  entries: LedgerEntryDraft[];
}

export class LedgerError extends Error {}

function opposite(direction: LedgerDirection): LedgerDirection {
  return direction === 'DEBIT' ? 'CREDIT' : 'DEBIT';
}

/**
 * Double-entry journal construction. Every balance movement is recorded as two
 * equal-and-opposite entries (player ↔ counterparty) so the books always
 * balance: `Σ debits = Σ credits`. The builder enforces this invariant.
 */
export const Ledger = {
  totals(entries: LedgerEntryDraft[]): { debit: Money; credit: Money } {
    let debit = Money.ZERO;
    let credit = Money.ZERO;
    for (const entry of entries) {
      if (entry.direction === 'DEBIT') debit = Money.add(debit, entry.amount);
      else credit = Money.add(credit, entry.amount);
    }
    return { debit, credit };
  },

  /** Throw unless debits and credits net to zero. */
  assertBalanced(entries: LedgerEntryDraft[]): void {
    const { debit, credit } = Ledger.totals(entries);
    if (!Money.eq(debit, credit)) {
      throw new LedgerError(`Unbalanced journal: debit ${debit} ≠ credit ${credit}`);
    }
  },

  /**
   * Build a balanced two-sided journal for a player movement. `playerDirection`
   * is the direction applied to the player wallet (DEBIT = funds leave the
   * player); the counterparty receives the opposite.
   */
  simple(input: {
    reference: string;
    currency: string;
    amount: Money;
    playerWalletRef: string;
    counterpartyWalletRef: string;
    playerDirection: LedgerDirection;
    counterpartyAccount?: LedgerEntryDraft['account'];
  }): Journal {
    if (!Money.isPositive(input.amount)) {
      throw new LedgerError('Journal amount must be positive');
    }
    const entries: LedgerEntryDraft[] = [
      {
        account: 'player',
        walletRef: input.playerWalletRef,
        direction: input.playerDirection,
        amount: input.amount,
      },
      {
        account: input.counterpartyAccount ?? 'house',
        walletRef: input.counterpartyWalletRef,
        direction: opposite(input.playerDirection),
        amount: input.amount,
      },
    ];
    Ledger.assertBalanced(entries);
    return { reference: input.reference, currency: input.currency, entries };
  },
};
