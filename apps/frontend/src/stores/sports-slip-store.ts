import { create } from 'zustand';

export interface SlipLeg {
  matchId: string;
  marketId: string;
  selectionId: string;
  odds: number;
  matchName: string;
  marketName: string;
  selectionName: string;
}

interface SlipState {
  legs: SlipLeg[];
  /** Add a selection; replaces an existing leg from the same market. */
  add: (leg: SlipLeg) => void;
  remove: (selectionId: string) => void;
  toggle: (leg: SlipLeg) => void;
  clear: () => void;
  has: (selectionId: string) => boolean;
}

/**
 * The bet slip — selections accumulate here across the sportsbook. Two legs from
 * the same market replace each other (you cannot back both sides on one slip).
 */
export const useSlipStore = create<SlipState>((set, get) => ({
  legs: [],

  add: (leg) =>
    set((state) => ({
      legs: [...state.legs.filter((l) => l.marketId !== leg.marketId), leg],
    })),

  remove: (selectionId) =>
    set((state) => ({ legs: state.legs.filter((l) => l.selectionId !== selectionId) })),

  toggle: (leg) => {
    if (get().has(leg.selectionId)) get().remove(leg.selectionId);
    else get().add(leg);
  },

  clear: () => set({ legs: [] }),

  has: (selectionId) => get().legs.some((l) => l.selectionId === selectionId),
}));
