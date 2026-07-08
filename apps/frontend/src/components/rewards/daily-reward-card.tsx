'use client';

import { Button } from '@gaming-platform/ui';
import { CalendarCheck, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { sound } from '@/lib/sound';
import { usePlayerProfile } from '@/stores/player-profile';

/**
 * Compact Daily Reward claim card (Phase 1.3.3) for the Promotions offer center.
 * Reuses the existing `claimDaily()` flow — which credits the wallet as a Bonus
 * — so there is no duplicated reward logic. Mounted-gated for hydration safety.
 */
export function DailyRewardCard() {
  const streak = usePlayerProfile((s) => s.dailyStreak);
  const claimedToday = usePlayerProfile((s) => s.dailyClaimedToday);
  const claimDaily = usePlayerProfile((s) => s.claimDaily);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const reward = 5000 + streak * 1000;

  const claim = () => {
    const amount = claimDaily();
    if (amount > 0) {
      sound.play('reward');
      toast.success(`Daily reward claimed — +₹${amount.toLocaleString('en-US')}! 🎁`);
    } else {
      toast.info('Already claimed today — come back tomorrow.');
    }
  };

  return (
    <div className="card-premium relative flex flex-col overflow-hidden p-6">
      <div className="bg-aurora pointer-events-none absolute inset-0 opacity-10" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-warning text-white shadow-glow-gold">
          <CalendarCheck className="h-6 w-6" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold">Daily Reward</h3>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-warning" /> {mounted ? streak : 0}-day streak
          </p>
        </div>
      </div>
      <p className="relative mt-4 text-sm text-muted-foreground">
        Log in every day for a growing coin bonus, credited straight to your wallet.
      </p>
      <Button
        variant="gold"
        size="lg"
        className="sheen relative mt-auto w-full"
        onClick={claim}
        disabled={mounted && claimedToday}
      >
        {mounted && claimedToday ? 'Claimed today' : `Claim +₹${reward.toLocaleString('en-US')}`}
      </Button>
    </div>
  );
}
