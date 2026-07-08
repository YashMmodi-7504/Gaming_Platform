'use client';

import { Button, Input, cn } from '@gaming-platform/ui';
import { ArrowDownToLine, Coins, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { useDemoWallet } from '@/stores/demo-wallet';

const QUICK = [100, 500, 1000, 5000, 10000];

/**
 * Deposit page (Phase 1.2). Instantly funds the demo wallet — no payment
 * gateway, no backend. Quick amounts + a custom amount, updates everywhere.
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
    <section className="mx-auto w-full max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ArrowDownToLine className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Deposit</h1>
          <p className="text-sm text-muted-foreground">Add demo funds instantly — no card required.</p>
        </div>
      </div>

      {/* Current balance */}
      <div className="card-premium flex items-center justify-between p-5">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Coins className="h-4 w-4 text-gold" /> Current balance
        </span>
        <span className="font-mono text-2xl font-extrabold tabular-nums text-foreground">
          ₹<AnimatedNumber value={balance} />
        </span>
      </div>

      <div className="card-premium space-y-5 p-6">
        {/* Quick amounts */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick amount
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className={cn(
                  'rounded-xl border px-2 py-2.5 text-sm font-bold tabular-nums transition-all active:scale-95',
                  Number(amount) === q
                    ? 'border-primary bg-primary/10 text-primary shadow-glow-sm'
                    : 'border-black/10 bg-white/60 text-foreground hover:border-primary/40',
                )}
              >
                ₹{q.toLocaleString('en-US')}
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Custom amount
          </p>
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
        </div>

        <Button
          variant="gradient"
          size="xl"
          className="sheen w-full"
          disabled={!valid}
          onClick={submit}
        >
          <Wallet className="h-5 w-5" /> Deposit {valid ? `₹${Math.floor(value).toLocaleString('en-US')}` : ''}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Want to cash out?{' '}
        <Link href="/withdraw" className="font-semibold text-primary hover:underline">
          Withdraw funds
        </Link>
      </p>
    </section>
  );
}
