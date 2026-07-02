'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { CalendarDays, Check, Coins, Flame, Gift } from 'lucide-react';
import { toast } from 'sonner';

import { LuckyWheel } from '@/components/rewards/lucky-wheel';
import { MysteryChest } from '@/components/rewards/mystery-chest';
import { sound } from '@/lib/sound';
import { usePlayerProfile } from '@/stores/player-profile';

const WEEK = [500, 750, 1000, 1500, 2000, 3000, 5000];

export default function DailyRewardsPage() {
  const p = usePlayerProfile();

  const claimToday = () => {
    const reward = p.claimDaily();
    if (reward > 0) {
      sound.play('reward');
      toast.success(`Day ${p.dailyStreak} claimed — +${reward.toLocaleString()} coins! 🎁`);
    } else {
      toast.info('Already claimed today — come back tomorrow!');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="card-premium relative overflow-hidden p-6 sm:p-8">
        <div className="bg-aurora absolute inset-0 opacity-10" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="gold" className="mb-2 gap-1">
              <Flame className="h-3.5 w-3.5" /> {p.dailyStreak}-day streak
            </Badge>
            <h1 className="font-display text-3xl font-bold">
              Daily <span className="text-gradient-gold">Rewards</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Log in every day, spin the wheel and open chests for free coins & XP.
            </p>
          </div>
          <Button variant="gold" size="lg" className="sheen" onClick={claimToday} disabled={p.dailyClaimedToday}>
            <Gift className="h-5 w-5" /> {p.dailyClaimedToday ? 'Claimed today' : `Claim +${(5000 + p.dailyStreak * 1000).toLocaleString()}`}
          </Button>
        </div>
      </section>

      {/* 7-day streak */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Flame className="h-5 w-5 text-warning" /> 7-Day Login Streak
        </h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {WEEK.map((amt, i) => {
            const done = i < p.dailyStreak;
            const today = i === p.dailyStreak && !p.dailyClaimedToday;
            return (
              <motion.div
                key={i}
                whileHover={{ y: -3 }}
                className={cn(
                  'card-premium flex flex-col items-center gap-1 p-3 text-center',
                  done && 'ring-1 ring-emerald/40',
                  today && 'ring-2 ring-gold shadow-glow-gold',
                )}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Day {i + 1}
                </span>
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    done ? 'bg-emerald/15 text-emerald' : 'bg-gradient-to-br from-gold/20 to-warning/10 text-gold',
                  )}
                >
                  {done ? <Check className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
                </span>
                <span className="font-mono text-xs font-bold tabular-nums">{amt.toLocaleString()}</span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Mini-games */}
      <section className="grid gap-4 lg:grid-cols-2">
        <LuckyWheel />
        <MysteryChest />
      </section>

      {/* 30-day calendar */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <CalendarDays className="h-5 w-5 text-primary" /> 30-Day Calendar
        </h2>
        <div className="card-premium grid grid-cols-6 gap-2 p-4 sm:grid-cols-10">
          {Array.from({ length: 30 }).map((_, i) => {
            const done = i < p.dailyStreak;
            const milestone = (i + 1) % 7 === 0;
            return (
              <div
                key={i}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center rounded-xl text-[11px] font-bold',
                  done
                    ? 'bg-gradient-to-br from-emerald/20 to-emerald/5 text-emerald'
                    : milestone
                      ? 'bg-gradient-to-br from-gold/25 to-warning/10 text-gold ring-1 ring-gold/40'
                      : 'bg-black/[0.03] text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : milestone ? <Gift className="h-4 w-4" /> : i + 1}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
