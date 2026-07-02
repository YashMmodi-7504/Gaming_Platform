'use client';

import { Badge, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Flame, Gamepad2, Medal, Percent } from 'lucide-react';

import { PresenceBadge } from '@/components/presence/presence-badge';
import { competitorStats } from '@/lib/competition';
import { avatarGradient, flagFor, initials } from '@/lib/ecosystem-data';
import { presenceFor } from '@/lib/player-presence';

export interface ParticipantCardProps {
  id: string;
  name: string;
  seed?: number;
  /** Standings rank if known (otherwise a deterministic one is derived). */
  rank?: number;
  index?: number;
}

/**
 * Rich, reusable competitor card. Deterministic from the participant id —
 * avatar, country, level, live presence (via the shared PresenceBadge),
 * favorite game, win rate, current streak and achievement count.
 */
export function ParticipantCard({ id, name, seed, rank, index = 0 }: ParticipantCardProps) {
  const stats = competitorStats(id, rank);
  const presence = presenceFor(id, stats.online);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.4) }}
      whileHover={{ y: -3 }}
      className="card-premium flex flex-col gap-3 p-4"
    >
      <div className="flex items-center gap-3">
        {/* avatar + live ring */}
        <div className="relative shrink-0">
          <span
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br font-display text-sm font-bold text-white shadow-glow-sm',
              avatarGradient(id),
            )}
          >
            {initials(name)}
          </span>
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
              stats.online ? 'bg-emerald shadow-glow-sm' : 'bg-muted-foreground/50',
            )}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{name}</p>
            <span className="text-sm leading-none">{flagFor(id)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
              Lv {stats.level}
            </Badge>
            {seed ? (
              <span className="font-mono text-[10px] tabular-nums text-accent">Seed #{seed}</span>
            ) : (
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                Rank #{stats.rank}
              </span>
            )}
          </div>
        </div>
      </div>

      <PresenceBadge presence={presence} showElapsed />

      {/* competitive stats */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <Stat icon={<Percent className="h-3 w-3" />} label="Win rate" value={`${stats.winRate}%`} tone="text-emerald" />
        <Stat icon={<Flame className="h-3 w-3" />} label="Streak" value={`${stats.streak}`} tone="text-pink" />
        <Stat icon={<Gamepad2 className="h-3 w-3" />} label="Main" value={stats.favoriteGame} tone="text-accent" />
        <Stat icon={<Medal className="h-3 w-3" />} label="Cups" value={`${stats.achievements}`} tone="text-gold" />
      </div>
    </motion.div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-black/[0.03] px-2 py-1.5">
      <span className={cn('shrink-0', tone)}>{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('ml-auto truncate font-mono font-semibold tabular-nums', tone)}>{value}</span>
    </div>
  );
}
