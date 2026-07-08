'use client';

import { Button, Input, cn } from '@gaming-platform/ui';
import { ArrowDownToLine, Coins, Info, Lightbulb, ShieldCheck, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { WalletInfoCard } from '@/components/wallet/wallet-info-card';
import { useDemoWallet } from '@/stores/demo-wallet';

const QUICK = [100, 500, 1000, 5000, 10000];

/**
 * Deposit page (Phase 1.2). Instantly funds the demo wallet — no payment
 * gateway, no backend. Quick amounts + a custom amount, updates everywhere.
 * Phase 1.2.1: premium full-width two-column layout (logic unchanged).
 */
export default function DepositPage() {
  const balance = useDemoWallet((s) => s.balance);
  const deposit = useDemoWallet((s) => s.deposit);
  const [amount, setAmount] = useState('');

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;

  const submit = () => {
    if (!valid) {
      toast.error('Enter a valid amount to deposit.');
      return;
    }
    deposit(value);
    toast.success(`Deposited ₹${Math.floor(value).toLocaleString('en-US')} — happy playing!`);
    setAmount('');
  };

  return (
    <section className="mx-auto w-full max-w-[1180px] space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ArrowDownToLine className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Deposit</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Add demo funds instantly — no card required.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:gap-8">
        {/* LEFT — balance + form */}
        <div className="space-y-6">
          {/* Big current-balance card (the visual focus) */}
          <div className="card-premium flex flex-col gap-2 p-7 sm:p-9">
            <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Coins className="h-4 w-4 text-gold" /> Current balance
            </span>
            <span className="font-mono text-5xl font-extrabold tabular-nums text-foreground sm:text-6xl">
              ₹<AnimatedNumber value={balance} />
            </span>
            <span className="text-sm text-muted-foreground">Available to play across the platform.</span>
          </div>

          {/* Deposit form */}
          <div className="card-premium space-y-7 p-6 sm:p-8">
            {/* Quick amounts */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick amount
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className={cn(
                      'rounded-xl border px-3 py-4 text-base font-bold tabular-nums transition-all active:scale-95',
                      Number(amount) === q
                        ? 'border-primary bg-primary/10 text-primary shadow-glow-sm'
                        : 'border-black/10 bg-white/60 text-foreground hover:border-primary/40 hover:-translate-y-0.5',
                    )}
                  >
                    ₹{q.toLocaleString('en-US')}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom amount
              </p>
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
            </div>

            <Button
              variant="gradient"
              size="xl"
              className="sheen h-14 w-full text-base"
              disabled={!valid}
              onClick={submit}
            >
              <Wallet className="h-5 w-5" /> Deposit{' '}
              {valid ? `₹${Math.floor(value).toLocaleString('en-US')}` : ''}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Want to cash out?{' '}
              <Link href="/withdraw" className="font-semibold text-primary hover:underline">
                Withdraw funds
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT — elegant info cards */}
        <aside className="space-y-4">
          <WalletInfoCard
            icon={ShieldCheck}
            tone="text-emerald"
            title="Safe demo wallet"
            desc="Play-money only. No real funds, no card details, and nothing at risk."
          />
          <WalletInfoCard
            icon={Zap}
            tone="text-primary"
            title="Instant balance updates"
            desc="Deposits reflect immediately in the header and everywhere you play."
          />
          <WalletInfoCard
            icon={Info}
            tone="text-accent"
            title="Demo mode"
            desc="This is a demo environment. Your balance is stored locally on this device."
          />
          <WalletInfoCard icon={Lightbulb} tone="text-gold" title="Deposit tips">
            <ul className="mt-1 space-y-1.5 text-sm text-muted-foreground">
              <li>• Use a quick amount for a one-tap top-up.</li>
              <li>• Or enter any custom amount you like.</li>
              <li>• Fund once — it stays until you withdraw or log out.</li>
            </ul>
          </WalletInfoCard>
        </aside>
      </div>
    </section>
  );
}
