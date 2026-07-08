'use client';

import { Button, Input, cn } from '@gaming-platform/ui';
import { ArrowUpFromLine, Coins, Info, Lightbulb, ShieldCheck, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { WalletInfoCard } from '@/components/wallet/wallet-info-card';
import { useDemoWallet } from '@/stores/demo-wallet';

const QUICK = [100, 500, 1000, 5000];

/**
 * Withdraw page (Phase 1.2). Debits the demo wallet with validation — you can
 * never withdraw more than your balance. Demo confirmation, no backend.
 * Phase 1.2.1: premium full-width two-column layout (logic unchanged).
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
    <section className="mx-auto w-full max-w-[1180px] space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
          <ArrowUpFromLine className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Withdraw</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Cash out demo funds instantly.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:gap-8">
        {/* LEFT — balance + form */}
        <div className="space-y-6">
          {/* Big available-balance card (the visual focus) */}
          <div className="card-premium flex flex-col gap-2 p-7 sm:p-9">
            <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Coins className="h-4 w-4 text-gold" /> Available balance
            </span>
            <span className="font-mono text-5xl font-extrabold tabular-nums text-foreground sm:text-6xl">
              ₹<AnimatedNumber value={balance} />
            </span>
            <span className="text-sm text-muted-foreground">The maximum you can cash out right now.</span>
          </div>

          {/* Withdraw form */}
          <div className="card-premium space-y-7 p-6 sm:p-8">
            {/* Quick amounts */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick amount
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={q > balance}
                    onClick={() => setAmount(String(q))}
                    className={cn(
                      'rounded-xl border px-3 py-4 text-base font-bold tabular-nums transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
                      Number(amount) === q
                        ? 'border-emerald bg-emerald/10 text-emerald shadow-glow-sm'
                        : 'border-black/10 bg-white/60 text-foreground hover:border-emerald/40 hover:-translate-y-0.5',
                    )}
                  >
                    ₹{q.toLocaleString('en-US')}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div className="space-y-3">
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
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-muted-foreground">
                  ₹
                </span>
                <Input
                  inputMode="numeric"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="h-14 pl-9 font-mono text-lg"
                />
              </div>
              {exceeds ? (
                <p className="text-sm text-destructive">
                  Amount exceeds your balance of ₹{balance.toLocaleString('en-US')}.
                </p>
              ) : null}
            </div>

            <Button
              variant="gradient"
              size="xl"
              className="h-14 w-full text-base"
              disabled={!canSubmit}
              onClick={submit}
            >
              <Wallet className="h-5 w-5" /> Withdraw{' '}
              {canSubmit ? `₹${Math.floor(value).toLocaleString('en-US')}` : ''}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Need funds?{' '}
              <Link href="/deposit" className="font-semibold text-primary hover:underline">
                Deposit instead
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT — elegant info cards */}
        <aside className="space-y-4">
          <WalletInfoCard
            icon={ShieldCheck}
            tone="text-emerald"
            title="Balance-protected"
            desc="You can never withdraw more than your available balance."
          />
          <WalletInfoCard
            icon={Zap}
            tone="text-primary"
            title="Instant cash-out"
            desc="Withdrawals apply immediately and sync across the whole platform."
          />
          <WalletInfoCard
            icon={Info}
            tone="text-accent"
            title="Demo mode"
            desc="This is a demo environment. Your balance is stored locally on this device."
          />
          <WalletInfoCard icon={Lightbulb} tone="text-gold" title="Withdraw tips">
            <ul className="mt-1 space-y-1.5 text-sm text-muted-foreground">
              <li>• Tap Max to cash out your full balance.</li>
              <li>• Quick amounts grey out if they exceed your balance.</li>
              <li>• Top up again any time from Deposit.</li>
            </ul>
          </WalletInfoCard>
        </aside>
      </div>
    </section>
  );
}
