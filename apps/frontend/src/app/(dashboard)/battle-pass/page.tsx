'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import {
  Award,
  Check,
  Coins,
  Crown,
  Lock,
  Package,
  Shield,
  Smile,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { sound } from '@/lib/sound';
import { SEASON, battlePassTiers, type RewardKind, type Tier } from '@/lib/ecosystem-data';

/** Icon per reward kind. */
const KIND_ICON: Record<RewardKind, LucideIcon> = {
  coins: Coins,
  xp: Zap,
  badge: Shield,
  title: Award,
  skin: Sparkles,
  lootbox: Package,
  frame: Crown,
  emote: Smile,
};

function RewardTile({
  reward,
  premium,
  state,
  claimed,
  onClaim,
}: {
  reward: { kind: RewardKind; label: string };
  premium?: boolean;
  state: 'done' | 'current' | 'future';
  claimed: boolean;
  onClaim?: () => void;
}) {
  const Icon = KIND_ICON[reward.kind] ?? Sparkles;
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors',
        premium
          ? 'border-gold/40 bg-gradient-to-br from-gold/10 to-warning/5'
          : 'border-black/10 bg-black/[0.02]',
        state === 'future' && 'opacity-60',
        claimed && 'ring-1 ring-emerald/50',
      )}
    >
      {premium ? (
        <span className="absolute right-1 top-1 text-gold">
          {claimed ? <Check className="h-3 w-3 text-emerald" /> : <Lock className="h-3 w-3" />}
        </span>
      ) : claimed ? (
        <span className="absolute right-1 top-1">
          <Check className="h-3 w-3 text-emerald" />
        </span>
      ) : null}

      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg text-white',
          premium
            ? 'bg-gradient-to-br from-gold to-warning shadow-glow-gold'
            : 'bg-gradient-to-br from-primary to-violet shadow-glow-sm',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="line-clamp-2 text-[10px] font-semibold leading-tight">{reward.label}</span>

      {onClaim ? (
        <button
          type="button"
          onClick={onClaim}
          className="mt-0.5 rounded-full bg-emerald/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald transition-colors hover:bg-emerald/25"
        >
          Claim
        </button>
      ) : null}
    </div>
  );
}

function TierColumn({
  tier,
  claimedFree,
  onClaimFree,
}: {
  tier: Tier;
  claimedFree: boolean;
  onClaimFree: (t: number) => void;
}) {
  const state: 'done' | 'current' | 'future' = tier.current
    ? 'current'
    : tier.claimed
      ? 'done'
      : 'future';

  // Cosmetic free-claim: unclaimed free tiles at/below the current tier.
  const freeClaimable = tier.tier <= SEASON.currentTier && !claimedFree;

  return (
    <div
      className={cn(
        'flex w-32 shrink-0 flex-col gap-2 rounded-2xl border p-2',
        tier.current
          ? 'border-gold ring-2 ring-gold shadow-glow-gold'
          : tier.claimed
            ? 'border-emerald/30 bg-emerald/[0.03]'
            : 'border-black/10 bg-white/40',
      )}
    >
      <div className="flex items-center justify-center gap-1">
        {tier.current ? (
          <Star className="h-3.5 w-3.5 text-gold" />
        ) : tier.claimed ? (
          <Check className="h-3.5 w-3.5 text-emerald" />
        ) : null}
        <span
          className={cn(
            'font-display text-xs font-bold tabular-nums',
            tier.current ? 'text-gradient-gold' : 'text-muted-foreground',
          )}
        >
          Tier {tier.tier}
        </span>
      </div>

      <span className="text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        Free
      </span>
      <RewardTile
        reward={tier.free}
        state={state}
        claimed={claimedFree}
        onClaim={freeClaimable ? () => onClaimFree(tier.tier) : undefined}
      />

      <span className="text-center text-[9px] font-semibold uppercase tracking-wide text-gold">
        Premium
      </span>
      <RewardTile reward={tier.premium} premium state={state} claimed={tier.claimed} />
    </div>
  );
}

export default function BattlePassPage() {
  const tiers = battlePassTiers();
  const [claimedFree, setClaimedFree] = useState<Set<number>>(new Set());

  const seasonPct = Math.min(100, Math.round((SEASON.currentTier / SEASON.tiers) * 100));

  const claimFree = (t: number) => {
    setClaimedFree((prev) => {
      if (prev.has(t)) return prev;
      const next = new Set(prev);
      next.add(t);
      return next;
    });
    sound.play('coin');
    toast.success(`Tier ${t} free reward claimed! 🎁`);
  };

  return (
    <div className="space-y-8">
      {/* Season header */}
      <section className="card-premium bg-grid relative overflow-hidden p-6 sm:p-8">
        <div className="bg-aurora absolute inset-0 opacity-10" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="gold" className="mb-2 gap-1">
                <Crown className="h-3.5 w-3.5" /> Battle Pass
              </Badge>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">
                <span className="text-gradient-gold">{SEASON.name}</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ends in <span className="font-semibold text-foreground">{SEASON.endInDays} days</span>
              </p>
            </div>
            <Button variant="ghost" className="glass border border-gold/40 text-gold">
              <Crown className="h-4 w-4" /> Premium · visual only
            </Button>
          </div>

          {/* Season progress */}
          <div>
            <div className="mb-2 flex items-end justify-between">
              <span className="font-display text-2xl font-bold">
                Tier{' '}
                <span className="text-gradient-gold">
                  <AnimatedNumber value={SEASON.currentTier} />
                </span>{' '}
                <span className="text-lg text-muted-foreground">/ {SEASON.tiers}</span>
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-gold">
                {seasonPct}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${seasonPct}%` }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-gold via-warning to-gold shadow-glow-gold"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Tier track */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Sparkles className="h-5 w-5 text-primary" /> Season Rewards
        </h2>
        <div className="card-premium overflow-hidden p-4">
          <div className="flex gap-3 overflow-x-auto pb-3">
            {tiers.map((t) => (
              <TierColumn
                key={t.tier}
                tier={t}
                claimedFree={claimedFree.has(t.tier)}
                onClaimFree={claimFree}
              />
            ))}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Scroll horizontally to explore all {SEASON.tiers} tiers. Premium rewards are visual only.
        </p>
      </section>
    </div>
  );
}
