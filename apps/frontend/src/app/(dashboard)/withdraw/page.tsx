'use client';

import { Button, Input, cn } from '@gaming-platform/ui';
import { ArrowUpFromLine, Coins, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { useDemoWallet } from '@/stores/demo-wallet';

const QUICK = [100, 500, 1000, 5000];

/**
 * Withdraw page (Phase 1.2). Debits the demo wallet with validation — you can
 * never withdraw more than your balance. Demo confirmation, no backend.
 */
export default function WithdrawPage() {
  const balance = useDemoWallet((s) => s.balance);
  const withdraw = useDemoWallet((s) => s.withdraw);
  const [amount, setAmount] = useState('');

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;
  const exceeds = valid && value > balance;
  const canSubmit = valid && !exceeds;

  const submit = () => {
    if (!valid) {
      toast.error('Enter a valid amount to withdraw.');
      return;
    }
    const ok = withdraw(value);
    if (!ok) {
      toast.error('You cannot withdraw more than your balance.');
      return;
    }
    toast.success(`Withdrew ₹${Math.floor(value).toLocaleString('en-US')}.`);
    setAmount('');
  };

  return (
    <section className="mx-auto w-full max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
          <ArrowUpFromLine className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Withdraw</h1>
          <p className="text-sm text-muted-foreground">Cash out demo funds instantly.</p>
        </div>
      </div>

      {/* Current balance */}
      <div className="card-premium flex items-center justify-between p-5">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Coins className="h-4 w-4 text-gold" /> Available balance
        </span>
        <span className="font-mono text-2xl font-extrabold tabular-nums text-foreground">
          ₹<AnimatedNumber value={balance} />
        </span>
      </div>

      <div className="card-premium space-y-5 p-6">
        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              disabled={q > balance}
              onClick={() => setAmount(String(q))}
              className={cn(
                'rounded-xl border px-2 py-2.5 text-sm font-bold tabular-nums transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
                Number(amount) === q
                  ? 'border-emerald bg-emerald/10 text-emerald shadow-glow-sm'
                  : 'border-black/10 bg-white/60 text-foreground hover:border-emerald/40',
              )}
            >
              ₹{q.toLocaleString('en-US')}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Amount
            </p>
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              disabled={balance <= 0}
              className="text-xs font-semibold text-emerald hover:underline disabled:opacity-40"
            >
              Max
            </button>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted-foreground">
              ₹
            </span>
            <Input
              inputMode="numeric"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              className="pl-7 font-mono"
            />
          </div>
          {exceeds ? (
            <p className="text-xs text-destructive">Amount exceeds your balance of ₹{balance.toLocaleString('en-US')}.</p>
          ) : null}
        </div>

        <Button
          variant="gradient"
          size="xl"
          className="w-full"
          disabled={!canSubmit}
          onClick={submit}
        >
          <Wallet className="h-5 w-5" /> Withdraw{' '}
          {canSubmit ? `₹${Math.floor(value).toLocaleString('en-US')}` : ''}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Need funds?{' '}
        <Link href="/deposit" className="font-semibold text-primary hover:underline">
          Deposit instead
        </Link>
      </p>
    </section>
  );
}
