'use client';

import { cn } from '@gaming-platform/ui';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Lock,
  Receipt,
  Spade,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { fmtTime } from '@/lib/datetime';
import { useDemoWallet } from '@/stores/demo-wallet';

/**
 * Dashboard Wallet Summary widget (Phase 1.3). Reuses card-premium + the shared
 * type scale. Client-only + mounted-gated (reads the persisted wallet + "today"),
 * so it never causes a hydration mismatch.
 */
export function WalletSummary() {
  const balance = useDemoWallet((s) => s.balance);
  const vault = useDemoWallet((s) => s.vault);
  const transactions = useDemoWallet((s) => s.transactions);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const t0 = start.getTime();
    const sum = { deposit: 0, withdraw: 0, bet: 0, win: 0 };
    for (const t of transactions) {
      if (t.ts < t0) continue;
      if (t.type === 'deposit') sum.deposit += t.amount;
      else if (t.type === 'withdraw') sum.withdraw += Math.abs(t.amount);
      else if (t.type === 'bet') sum.bet += Math.abs(t.amount);
      else if (t.type === 'win') sum.win += t.amount;
    }
    return sum;
  }, [transactions]);

  const recent = transactions.slice(0, 5);

  if (!mounted) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight md:text-2xl">
          <Wallet className="h-5 w-5 text-primary" /> Wallet summary
        </h2>
        <Link
          href="/deposit"
          className="text-sm font-semibold text-primary transition-colors hover:underline"
        >
          Deposit →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Balances + today */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat icon={Coins} tone="text-gold" label="Wallet" value={balance} big />
          <Stat icon={Lock} tone="text-violet" label="Vault" value={vault} big />
          <Stat icon={ArrowDownToLine} tone="text-emerald" label="Today deposits" value={today.deposit} />
          <Stat icon={ArrowUpFromLine} tone="text-destructive" label="Today withdrawals" value={today.withdraw} />
          <Stat icon={Spade} tone="text-muted-foreground" label="Today bets" value={today.bet} />
          <Stat icon={TrendingUp} tone="text-emerald" label="Today wins" value={today.win} />
        </div>

        {/* Recent transactions */}
        <div className="card-premium flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Receipt className="h-4 w-4 text-primary" /> Recent
            </span>
            <Link href="/transactions" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">
              No transactions yet.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{t.label}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {t.ref} · {fmtTime(t.ts)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-sm font-bold tabular-nums',
                      t.amount > 0 ? 'text-emerald' : 'text-foreground',
                    )}
                  >
                    {t.amount > 0 ? '+' : '−'}₹{Math.abs(t.amount).toLocaleString('en-US')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  big,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: number;
  big?: boolean;
}) {
  return (
    <div className="card-premium flex flex-col gap-1 p-4">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5', tone)} /> {label}
      </span>
      <span
        className={cn(
          'font-mono font-extrabold tabular-nums text-foreground',
          big ? 'text-2xl' : 'text-lg',
        )}
      >
        ₹<AnimatedNumber value={value} />
      </span>
    </div>
  );
}
