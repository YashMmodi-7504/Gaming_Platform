'use client';

import { Badge, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Award, Crown, Medal } from 'lucide-react';

import { avatarGradient, initials } from '@/lib/ecosystem-data';

export interface PrizeAward {
  rank: number;
  participantId: string;
  amount: string;
}

const TIER: Record<1 | 2 | 3, { label: string; card: string; chip: string; amount: string; icon: typeof Crown }> = {
  1: {
    label: 'Champion',
    card: 'border-gold/50 shadow-glow-gold sm:-mt-4 sm:pb-7',
    chip: 'bg-gold text-gold-foreground shadow-glow-gold',
    amount: 'text-gradient-gold',
    icon: Crown,
  },
  2: {
    label: 'Runner-up',
    card: 'border-foreground/20 shadow-glow-sm',
    chip: 'bg-foreground/80 text-background',
    amount: 'text-foreground/80',
    icon: Medal,
  },
  3: {
    label: '3rd place',
    card: 'border-warning/40',
    chip: 'bg-warning text-background',
    amount: 'text-warning',
    icon: Award,
  },
};

/** A single prize tier card (gold / silver / bronze). Reusable. */
export function PrizeCard({
  award,
  name,
  delay = 0,
}: {
  award: PrizeAward;
  name: string;
  delay?: number;
}) {
  const place = (award.rank <= 3 ? award.rank : 3) as 1 | 2 | 3;
  const t = TIER[place];
  const Icon = t.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 24 }}
      className={cn(
        'card-premium relative flex flex-col items-center rounded-2xl border p-5 text-center',
        t.card,
        place === 1 ? 'sm:order-2' : place === 2 ? 'sm:order-1' : 'sm:order-3',
      )}
    >
      <span className={cn('absolute -top-3 flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold', t.chip)}>
        {place === 1 ? <Crown className="h-4 w-4" /> : `#${place}`}
      </span>

      <span
        className={cn(
          'mt-1 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br font-display text-base font-bold text-white ring-2 ring-offset-2 ring-offset-card',
          avatarGradient(award.participantId),
          place === 1 ? 'ring-gold' : place === 2 ? 'ring-foreground/40' : 'ring-warning/60',
        )}
      >
        {initials(name)}
      </span>

      <p className="mt-2 truncate text-sm font-semibold">{name}</p>
      <Badge variant="outline" className="mt-1 gap-1 text-[10px]">
        <Icon className="h-3 w-3" /> {t.label}
      </Badge>
      <p className={cn('mt-2 font-mono text-xl font-extrabold tabular-nums', t.amount)}>{award.amount}</p>
    </motion.div>
  );
}

/** Top-3 prize podium (gold center, silver left, bronze right on ≥ sm). */
export function PrizePodium({
  awards,
  nameOf,
}: {
  awards: PrizeAward[];
  nameOf: (participantId: string) => string;
}) {
  const top = [...awards].sort((a, b) => a.rank - b.rank).slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
      {top.map((award, i) => (
        <PrizeCard key={award.participantId} award={award} name={nameOf(award.participantId)} delay={i * 0.08} />
      ))}
    </div>
  );
}
