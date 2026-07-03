'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import {
  Check,
  CircleDot,
  Coins,
  Dice5,
  Flame,
  Gamepad2,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { sound } from '@/lib/sound';
import { useMissions, type Mission } from '@/stores/missions';

/** Map the lucide icon NAME strings from the store to components. */
const ICONS: Record<string, LucideIcon> = {
  Rocket,
  CircleDot,
  Dice5,
  Sparkles,
  Gamepad2,
  Trophy,
  Flame,
};

function MissionCard({
  mission,
  index,
  onClaim,
}: {
  mission: Mission;
  index: number;
  onClaim: (m: Mission) => void;
}) {
  const Icon = ICONS[mission.icon] ?? Sparkles;
  const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
  const claimable = mission.progress >= mission.target && !mission.claimed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: (index % 6) * 0.05 }}
      className={cn(
        'card-premium relative flex flex-col gap-4 overflow-hidden p-5 transition-colors',
        claimable && 'ring-1 ring-gold/50 shadow-glow-gold',
        mission.claimed && 'opacity-80',
      )}
    >
      {claimable ? <div className="sheen pointer-events-none absolute inset-0" /> : null}

      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-glow-sm',
            mission.claimed
              ? 'bg-gradient-to-br from-emerald to-accent'
              : 'bg-gradient-to-br from-primary to-violet',
          )}
        >
          {mission.claimed ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">{mission.title}</p>
          <p className="truncate text-xs text-muted-foreground">{mission.desc}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-gold">
            <Coins className="h-3 w-3" />
            {mission.coins.toLocaleString('en-US')}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-accent">
            <Zap className="h-3 w-3" />
            {mission.xp} XP
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Progress</span>
          <span className="font-mono tabular-nums">
            {mission.progress} / {mission.target}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-black/5">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              mission.claimed
                ? 'bg-gradient-to-r from-emerald to-accent'
                : claimable
                  ? 'bg-gradient-to-r from-gold via-warning to-gold shadow-glow-gold'
                  : 'bg-gradient-to-r from-primary to-accent shadow-glow-sm',
            )}
          />
        </div>
      </div>

      {/* Action */}
      {mission.claimed ? (
        <Badge variant="success" className="w-full justify-center gap-1 py-1.5">
          <Check className="h-3.5 w-3.5" /> Claimed
        </Badge>
      ) : claimable ? (
        <Button variant="gold" className="sheen w-full" onClick={() => onClaim(mission)}>
          <Sparkles className="h-4 w-4" /> Claim reward
        </Button>
      ) : (
        <Button variant="ghost" disabled className="glass w-full cursor-not-allowed">
          In progress · {mission.progress} / {mission.target}
        </Button>
      )}
    </motion.div>
  );
}

export default function MissionsPage() {
  const daily = useMissions((s) => s.daily);
  const weekly = useMissions((s) => s.weekly);
  const claim = useMissions((s) => s.claim);

  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const all = [...daily, ...weekly];
  const claimedCount = all.filter((m) => m.claimed).length;
  const totalCount = all.length;

  const handleClaim = (m: Mission) => {
    const result = claim(m.id);
    if (!result) return;
    sound.play('reward');
    setFx({ key: Date.now(), type: 'win', amount: result.coins });
    toast.success(
      `${m.title} claimed — +${result.coins.toLocaleString('en-US')} coins & +${result.xp} XP! 🎉`,
    );
  };

  return (
    <div className="relative space-y-8">
      <GameFx trigger={fx} />

      {/* Header hero */}
      <section className="card-premium bg-grid relative overflow-hidden p-6 sm:p-8">
        <div className="bg-aurora absolute inset-0 opacity-10" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="neon" className="mb-2 gap-1">
              <Target className="h-3.5 w-3.5" /> Missions
            </Badge>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Daily <span className="text-gradient">Missions</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Play the games to advance your missions, then claim coins & XP.
            </p>
          </div>
          <div className="glass flex flex-col items-center gap-1 rounded-2xl px-6 py-4 text-center">
            <span className="font-display text-3xl font-bold text-gradient-gold">
              <AnimatedNumber value={claimedCount} />
              <span className="text-muted-foreground"> / {totalCount}</span>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Missions claimed
            </span>
          </div>
        </div>
      </section>

      {/* Daily */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Flame className="h-5 w-5 text-warning" /> Daily Missions
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {daily.map((m, i) => (
            <MissionCard key={m.id} mission={m} index={i} onClaim={handleClaim} />
          ))}
        </div>
      </section>

      {/* Weekly */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Trophy className="h-5 w-5 text-gold" /> Weekly Missions
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weekly.map((m, i) => (
            <MissionCard key={m.id} mission={m} index={i} onClaim={handleClaim} />
          ))}
        </div>
      </section>
    </div>
  );
}
