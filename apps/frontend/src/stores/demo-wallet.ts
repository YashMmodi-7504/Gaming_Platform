import { create } from 'zustand';

/**
 * Client-side demo wallet (development / demo mode only). Every demo account
 * gets 100,000 demo coins with unlimited reload — purely cosmetic, never touches
 * the backend wallet engine. Real wallets still come from the API in production.
 */
export const DEMO_START = 100_000;

interface DemoWalletState {
  balance: number;
  reload: () => void;
  spend: (amount: number) => void;
  credit: (amount: number) => void;
}

export const useDemoWallet = create<DemoWalletState>((set) => ({
  balance: DEMO_START,
  reload: () => set({ balance: DEMO_START }),
  spend: (amount) => set((s) => ({ balance: Math.max(0, s.balance - Math.max(0, amount)) })),
  credit: (amount) => set((s) => ({ balance: s.balance + Math.max(0, amount) })),
}));
