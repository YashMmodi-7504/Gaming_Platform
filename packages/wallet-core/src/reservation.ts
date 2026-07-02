import type { Money } from './money';

export type ReservationStatus = 'RESERVED' | 'COMMITTED' | 'RELEASED';

export interface Reservation {
  id: string;
  walletRef: string;
  amount: Money;
  status: ReservationStatus;
  reference: string;
}

export class ReservationError extends Error {}

/** Legal reservation transitions: a reservation is committed or released once. */
export const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  RESERVED: ['COMMITTED', 'RELEASED'],
  COMMITTED: [],
  RELEASED: [],
};

export const ReservationState = {
  assert(from: ReservationStatus, to: ReservationStatus): void {
    if (!RESERVATION_TRANSITIONS[from].includes(to)) {
      throw new ReservationError(`Illegal reservation transition ${from} → ${to}`);
    }
  },
};
