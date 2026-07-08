'use client';

import { Button } from '@gaming-platform/ui';
import { Wallet } from 'lucide-react';
import Link from 'next/link';

import { useDemoWallet } from '@/stores/demo-wallet';

/**
 * Deposit prompt shown wherever betting would start with an empty wallet
 * (Phase 1.2). Browsing is never blocked — only placing bets.
 */
export function DepositRequired({ className }: { className?: string }) {
  return (
    <div
      className={
        'flex min-h-[46vh] flex-col items-center justify-center gap-4 rounded-3xl border border-black/10 bg-white/70 p-8 text-center shadow-soft backdrop-blur ' +
        (className ?? '')
      }
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Wallet className="h-8 w-8" />
      </span>
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-foreground">Add funds to play</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          You need to deposit funds before placing bets. Browsing is always free.
        </p>
      </div>
      <Button asChild variant="gradient" size="xl" className="sheen">
        <Link href="/deposit">
          <Wallet className="h-5 w-5" /> Deposit Now
        </Link>
      </Button>
    </div>
  );
}

/**
 * Gates a betting surface: renders the game while the wallet has funds, and the
 * deposit prompt when the balance is ₹0.
 */
export function BetGate({ children }: { children: React.ReactNode }) {
  const balance = useDemoWallet((s) => s.balance);
  if (balance > 0) return <>{children}</>;
  return <DepositRequired />;
}
