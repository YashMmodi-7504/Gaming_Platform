'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { CircleDot, Club, Dice5, Play, Rocket, type LucideIcon, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import type { MatchRecord } from '@/lib/player-presence';

const GAME_ICON: Record<MatchRecord['game'], LucideIcon> = {
  Crash: Rocket,
  Dice: Dice5,
  Blackjack: Club,
  Roulette: CircleDot,
  Sportsbook: TrendingUp,
};

/** A single recent-match history row. Deterministic, visual-only replay. */
export function RecentMatch({ match, index = 0 }: { match: MatchRecord; index?: number }) {
  const Icon = GAME_ICON[match.game];
  const win = match.result === 'win';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/50 p-3 backdrop-blur transition-colors hover:border-primary/30"
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
          win ? 'bg-emerald/10 text-emerald ring-emerald/30' : 'bg-destructive/10 text-destructive ring-destructive/30',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{match.game}</p>
          <Badge variant={win ? 'success' : 'destructive'} className="px-1.5 py-0 text-[10px]">
            {win ? 'WIN' : 'LOSS'}
          </Badge>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          Stake <span className="font-mono tabular-nums text-foreground">${match.stake.toLocaleString('en-US')}</span>
          {win ? (
            <>
              {' '}· <span className="font-mono tabular-nums text-accent">{match.multiplier.toFixed(2)}×</span>
            </>
          ) : null}
          {' '}· {match.ago}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            'w-20 text-right font-mono text-sm font-bold tabular-nums',
            win ? 'text-emerald' : 'text-muted-foreground',
          )}
        >
          {win ? `+$${match.payout.toLocaleString('en-US')}` : `−$${match.stake.toLocaleString('en-US')}`}
        </span>
        <Button
          size="icon"
          variant="glass"
          className="h-8 w-8"
          aria-label={`Replay ${match.game} round`}
          onClick={() => toast(`Replaying ${match.game} round`, { icon: '▶️' })}
        >
          <Play className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

/** A titled list of recent matches for a player seed. */
export function RecentMatches({ matches }: { matches: MatchRecord[] }) {
  return (
    <div className="space-y-2">
      {matches.map((m, i) => (
        <RecentMatch key={m.id} match={m} index={i} />
      ))}
    </div>
  );
}
