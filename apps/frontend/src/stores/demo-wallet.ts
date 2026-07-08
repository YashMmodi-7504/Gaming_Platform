import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Client-side demo wallet (Phase 1.2). A single source of truth for the demo
 * balance, persisted to localStorage so deposits/withdrawals survive reloads.
 * Never touches the backend — real wallets still come from the API in
 * production. New sessions start at ₹0; players fund via /deposit before betting.
 */

/** Amount granted by the legacy demo "reload" convenience (cosmetics store). */
export const DEMO_RELOAD = 100_000;

interface DemoWalletState {
  balance: number;
  /** Add funds (demo deposit). */
  deposit: (amount: number) => void;
  /** Remove funds; returns false if the amount is invalid or exceeds balance. */
  withdraw: (amount: number) => boolean;
  /** Bet stake (never goes below 0). */
  spend: (amount: number) => void;
  /** Winnings / refund. */
  credit: (amount: number) => void;
  /** Legacy demo top-up used by the cosmetics store. */
  reload: () => void;
  /** Reset to ₹0 (e.g. on logout). */
  reset: () => void;
}

export const useDemoWallet = create<DemoWalletState>()(
  persist(
    (set, get) => ({
      balance: 0,
      deposit: (amount) => set((s) => ({ balance: s.balance + Math.max(0, Math.floor(amount)) })),
      withdraw: (amount) => {
        const amt = Math.max(0, Math.floor(amount));
        if (amt <= 0 || amt > get().balance) return false;
        set((s) => ({ balance: s.balance - amt }));
        return true;
      },
      spend: (amount) => set((s) => ({ balance: Math.max(0, s.balance - Math.max(0, amount)) })),
      credit: (amount) => set((s) => ({ balance: s.balance + Math.max(0, amount) })),
      reload: () => set({ balance: DEMO_RELOAD }),
      reset: () => set({ balance: 0 }),
    }),
    {
      name: 'gp-wallet',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ balance: s.balance }),
    },
  ),
);
