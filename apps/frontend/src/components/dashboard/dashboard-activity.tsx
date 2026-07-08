'use client';

import { cn } from '@gaming-platform/ui';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  Dices,
  Gift,
  Lock,
  Receipt,
  RefreshCw,
  Trophy,
  Unlock,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { fmtTime } from '@/lib/datetime';
import { type Transaction, type TxnType, useDemoWallet } from '@/stores/demo-wallet';

/**
 * Recent-activity + notification widgets (Phase 1.4). Everything is DERIVED from
 * the single wallet ledger (transactions + bets) — no duplicated state, no new
 * store. Client-only + mounted-gated for hydration safety.
 */

const TXN_META: Record<TxnType, { icon: LucideIcon; tone: string }> = {
  deposit: { icon: ArrowDownToLine, tone: 'text-emerald' },
  withdraw: { icon: ArrowUpFromLine, tone: 'text-destructive' },
  vault_in: { icon: Lock, tone: 'text-violet' },
  vault_out: { icon: Unlock, tone: 'text-violet' },
  bet: { icon: Dices, tone: 'text-muted-foreground' },
  win: { icon: Trophy, tone: 'text-emerald' },
  refund: { icon: RefreshCw, tone: 'text-accent' },
  bonus: { icon: Gift, tone: 'text-gold' },
};

/* --------------------------------------------------------- recent activity */

export function RecentActivity() {
  const transactions = useDemoWallet((s) => s.transactions);
  const bets = useDemoWallet((s) => s.bets);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Latest record of each notable type — "Latest deposit / withdraw / bonus /
  // vault / win". Single pass, no duplicated data.
  const latest = useMemo(() => {
    const find = (pred: (t: Transaction) => boolean) => transactions.find(pred);
    return {
      deposit: find((t) => t.type === 'deposit'),
      withdraw: find((t) => t.type === 'withdraw'),
      bonus: find((t) => t.type === 'bonus'),
      vault: find((t) => t.type === 'vault_in' || t.type === 'vault_out'),
      win: find((t) => t.type === 'win'),
    };
  }, [transactions]);

  const recentTxns = transactions.slice(0, 5);
  const recentBets = bets.slice(0, 5);

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight md:text-xl">
        <Receipt className="h-5 w-5 text-primary" /> Recent activity
      </h2>

      {/* Latest highlights */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Highlight label="Latest deposit" txn={mounted ? latest.deposit : undefined} type="deposit" />
        <Highlight label="Latest withdraw" txn={mounted ? latest.withdraw : undefined} type="withdraw" />
        <Highlight label="Latest bonus" txn={mounted ? latest.bonus : undefined} type="bonus" />
        <Highlight label="Latest vault" txn={mounted ? latest.vault : undefined} type="vault_in" />
        <Highlight label="Latest reward" txn={mounted ? latest.win : undefined} type="win" />
      </div>

      {/* Two ledgers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent transactions */}
        <div className="card-premium flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Receipt className="h-4 w-4 text-primary" /> Recent transactions
            </span>
            <Link href="/transactions" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          {!mounted || recentTxns.length === 0 ? (
            <Empty text="No transactions yet." />
          ) : (
            <ul className="space-y-2.5">
              {recentTxns.map((t) => {
                const { icon: Icon, tone } = TXN_META[t.type];
                return (
                  <li key={t.id} className="flex items-center gap-3">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04]', tone)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{t.label}</span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {t.ref} · {fmtTime(t.ts)}
                      </span>
                    </span>
                    <span className={cn('shrink-0 font-mono text-sm font-bold tabular-nums', t.amount > 0 ? 'text-emerald' : 'text-foreground')}>
                      {t.amount > 0 ? '+' : '−'}₹{Math.abs(t.amount).toLocaleString('en-US')}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent bets */}
        <div className="card-premium flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Dices className="h-4 w-4 text-primary" /> Recent bets
            </span>
            <Link href="/bets" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          {!mounted || recentBets.length === 0 ? (
            <Empty text="No bets yet — play a game to get started." />
          ) : (
            <ul className="space-y-2.5">
              {recentBets.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold uppercase', b.win ? 'bg-emerald/10 text-emerald' : 'bg-destructive/10 text-destructive')}>
                    {b.win ? 'W' : 'L'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{b.game}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {b.roundId} · {fmtTime(b.ts)}
                    </span>
                  </span>
                  <span className={cn('shrink-0 font-mono text-sm font-bold tabular-nums', b.win ? 'text-emerald' : 'text-destructive')}>
                    {b.net >= 0 ? '+' : '−'}₹{Math.abs(b.net).toLocaleString('en-US')}
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

function Highlight({ label, txn, type }: { label: string; txn?: Transaction; type: TxnType }) {
  const { icon: Icon, tone } = TXN_META[type];
  return (
    <div className="card-premium flex flex-col gap-1 p-4">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5', tone)} /> {label}
      </span>
      {txn ? (
        <>
          <span className="font-mono text-base font-bold tabular-nums text-foreground">
            {txn.amount > 0 ? '+' : '−'}₹{Math.abs(txn.amount).toLocaleString('en-US')}
          </span>
          <span className="truncate font-mono text-[10px] text-muted-foreground">{fmtTime(txn.ts)}</span>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

/* ----------------------------------------------------- notification center */

const NOTE_TEXT: Partial<Record<TxnType, string>> = {
  deposit: 'Deposit successful',
  withdraw: 'Withdrawal successful',
  bonus: 'Bonus received',
  vault_in: 'Moved funds to vault',
  vault_out: 'Moved funds to wallet',
  refund: 'Refund issued',
};

/** Types that surface as notifications (excludes routine bet/win spam). */
const NOTIFY_TYPES: TxnType[] = ['deposit', 'withdraw', 'bonus', 'vault_in', 'vault_out', 'refund'];

/**
 * Lightweight dashboard notification center (Objective 7). Derives up to 10
 * newest events from the wallet ledger — deposit/withdraw success, bonuses
 * received (incl. mission rewards), vault transfers, refunds — newest first.
 * Reuses the ledger as the single source rather than a parallel notification
 * store, so it updates live with every money movement.
 */
export function NotificationCenter() {
  const transactions = useDemoWallet((s) => s.transactions);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const notes = useMemo(
    () => transactions.filter((t) => NOTIFY_TYPES.includes(t.type)).slice(0, 10),
    [transactions],
  );

  return (
    <div className="card-premium flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Bell className="h-4 w-4 text-primary" /> Notifications
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {mounted ? notes.length : 0}
        </span>
      </div>
      {!mounted || notes.length === 0 ? (
        <Empty text="You're all caught up." />
      ) : (
        <ul className="space-y-2.5">
          {notes.map((t) => {
            const { icon: Icon, tone } = TXN_META[t.type];
            const text =
              t.note === 'mission' ? 'Mission reward claimed' : NOTE_TEXT[t.type] ?? t.label;
            return (
              <li key={t.id} className="flex items-start gap-3">
                <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04]', tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{text}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    {t.amount > 0 ? '+' : '−'}₹{Math.abs(t.amount).toLocaleString('en-US')} · {fmtTime(t.ts)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
