import type { TournamentStatus } from './types';

/**
 * Tournament lifecycle state machine. Only declared transitions are legal,
 * preventing illegal operations (e.g. starting a cancelled tournament or
 * registering after it has gone live).
 */
export const TOURNAMENT_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  draft: ['scheduled', 'registration', 'cancelled'],
  scheduled: ['registration', 'cancelled'],
  registration: ['checkin', 'live', 'cancelled'],
  checkin: ['live', 'cancelled'],
  live: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export class TournamentLifecycleError extends Error {}

export const TournamentLifecycle = {
  canTransition(from: TournamentStatus, to: TournamentStatus): boolean {
    return TOURNAMENT_TRANSITIONS[from].includes(to);
  },

  transition(from: TournamentStatus, to: TournamentStatus): TournamentStatus {
    if (!TournamentLifecycle.canTransition(from, to)) {
      throw new TournamentLifecycleError(`Illegal tournament transition ${from} → ${to}`);
    }
    return to;
  },

  isFinal(status: TournamentStatus): boolean {
    return status === 'completed' || status === 'cancelled';
  },

  acceptsRegistration(status: TournamentStatus): boolean {
    return status === 'registration' || status === 'scheduled';
  },
};
