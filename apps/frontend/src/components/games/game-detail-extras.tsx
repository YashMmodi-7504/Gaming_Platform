'use client';

import { Badge, Rail, cn } from '@gaming-platform/ui';
import {
  Activity,
  Crown,
  Image as ImageIcon,
  Lock,
  Medal,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { GameCover } from './game-cover';

/**
 * Additive, demo-safe "Steam-style" detail sections driven entirely by a
 * deterministic seed (the game id) so SSR and client agree and no backend is
 * touched: a live activity band, a screenshots gallery, an achievements strip,
 * and a leaderboard preview. Purely presentational polish.
 */

interface DetailGame {
  id: string;
  name: string;
  category?: { name: string; slug?: string } | null;
}

/** Deterministic integer in [min, max) from a string seed. */
function seededInt(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return min + ((h >>> 0) % (max - min));
}

const HANDLES = [
  'NovaStrike', 'PixelFox', 'GoldenAce', 'VoidRunner', 'LunaByte', 'CrimsonJet',
  'EchoWolf', 'ZenithX', 'NeonDrift', 'SolarFlare', 'IronPhantom', 'QuartzOwl',
];

function handle(seed: string): string {
  return HANDLES[seededInt(seed, 0, HANDLES.length)]!;
}

function initials(name: string): string {
  const upper = name.replace(/[^a-zA-Z]/g, '');
  return `${upper[0] ?? 'P'}${upper[Math.floor(upper.length / 2)] ?? 'X'}`.toUpperCase();
}

const AVATAR_TONES = [
  'from-primary to-violet',
  'from-accent to-primary',
  'from-gold to-warning',
  'from-emerald to-accent',
  'from-pink to-violet',
];

function Avatar({ seed, size = 'md' }: { seed: string; size?: 'sm' | 'md' }) {
  const tone = AVATAR_TONES[seededInt(`${seed}t`, 0, AVATAR_TONES.length)]!;
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white ring-2 ring-background',
        tone,
        size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs',
      )}
      aria-hidden
    >
      {initials(handle(seed))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Live activity band                                                  */
/* ------------------------------------------------------------------ */

function LiveTile({
  icon,
  label,
  value,
  tone,
  live,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
  live?: boolean;
}) {
  return (
    <div className="glass relative flex items-center gap-3 rounded-2xl px-4 py-3">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-black/5', tone)}>
        {icon}
      </span>
      <div className="leading-tight">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {live ? <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-emerald" /> : null}
          {label}
        </p>
        <p className={cn('font-mono text-lg font-bold tabular-nums', tone)}>{value}</p>
      </div>
    </div>
  );
}

export function GameLiveBand({ game }: { game: DetailGame }) {
  const base = seededInt(game.id, 240, 4200);
  const [players, setPlayers] = useState(base);
  const peak = seededInt(`${game.id}peak`, base + 500, base + 5200);
  const friends = seededInt(`${game.id}fr`, 2, 6);
  const rounds = seededInt(`${game.id}rd`, 12, 90);

  // Gently drift the live count so the number feels alive (reduced-motion aware).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('reduce-motion');
    if (reduced) return;
    const id = window.setInterval(() => {
      setPlayers((p) => {
        const delta = Math.floor((Math.sin(p) + 1) * 6) - 5;
        return Math.max(base - 60, Math.min(base + 120, p + delta));
      });
    }, 2200);
    return () => window.clearInterval(id);
  }, [base]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <LiveTile
        icon={<Users className="h-5 w-5" />}
        label="Players online"
        value={players.toLocaleString('en-US')}
        tone="text-emerald"
        live
      />
      <LiveTile
        icon={<Activity className="h-5 w-5" />}
        label="Peak 24h"
        value={peak.toLocaleString('en-US')}
        tone="text-accent"
      />
      <LiveTile
        icon={<Zap className="h-5 w-5" />}
        label="Rounds / min"
        value={rounds.toLocaleString('en-US')}
        tone="text-gold"
      />
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <div className="flex -space-x-2.5">
          {Array.from({ length: friends }).map((_, i) => (
            <Avatar key={i} seed={`${game.id}f${i}`} size="sm" />
          ))}
        </div>
        <div className="leading-tight">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Friends</p>
          <p className="font-mono text-sm font-bold tabular-nums text-primary">{friends} playing</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screenshots gallery                                                 */
/* ------------------------------------------------------------------ */

export function GameScreenshots({ game }: { game: DetailGame }) {
  const hint = `${game.category?.slug ?? ''} ${game.category?.name ?? ''}`;
  const shots = Array.from({ length: 5 });
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <ImageIcon className="h-5 w-5 text-accent" />
        Screenshots
      </h2>
      <Rail label={`${game.name} screenshots`}>
        {shots.map((_, i) => (
          <div
            key={i}
            className="group relative aspect-video w-72 shrink-0 snap-start overflow-hidden rounded-2xl border border-black/10 shadow-soft sm:w-80"
          >
            <GameCover
              name={`${game.name} — shot ${i + 1}`}
              seed={`${game.id}-shot-${i}`}
              hint={hint}
              showTitle={false}
              sizes="320px"
            />
          </div>
        ))}
      </Rail>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Achievements strip                                                  */
/* ------------------------------------------------------------------ */

const ACHIEVEMENTS = [
  { name: 'First Blood', desc: 'Win your first round', icon: Zap },
  { name: 'High Roller', desc: 'Place a max bet', icon: Crown },
  { name: 'On a Streak', desc: 'Win 5 in a row', icon: Activity },
  { name: 'Legend', desc: 'Reach the top 100', icon: Trophy },
];

export function GameAchievements({ game }: { game: DetailGame }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <Medal className="h-5 w-5 text-gold" />
        Achievements
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = seededInt(`${game.id}${a.name}`, 0, 100) > 45;
          const rarity = seededInt(`${game.id}${a.name}r`, 3, 68);
          const Icon = a.icon;
          return (
            <div
              key={a.name}
              className={cn(
                'card-premium flex items-center gap-3 p-4 transition-transform duration-200 hover:-translate-y-0.5',
                !unlocked && 'opacity-70',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  unlocked
                    ? 'bg-gradient-to-br from-gold to-warning text-white shadow-glow-gold'
                    : 'bg-black/5 text-muted-foreground',
                )}
              >
                {unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate font-display text-sm font-bold">{a.name}</p>
                <p className="truncate text-xs text-muted-foreground">{a.desc}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {rarity}% unlocked
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Leaderboard preview                                                 */
/* ------------------------------------------------------------------ */

const RANK_TONES = ['text-gold', 'text-muted-foreground', 'text-warning'];

export function GameLeaderboard({ game }: { game: DetailGame }) {
  const rows = Array.from({ length: 5 }).map((_, i) => ({
    rank: i + 1,
    seed: `${game.id}lb${i}`,
    score: seededInt(`${game.id}lb${i}s`, 12_000, 98_000) - i * 1400,
  }));
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <Trophy className="h-5 w-5 text-primary" />
        Top Players
      </h2>
      <div className="card-premium divide-y divide-black/5 overflow-hidden">
        {rows.map((r) => (
          <div key={r.rank} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/5">
            <span
              className={cn(
                'w-6 text-center font-display text-lg font-black tabular-nums',
                RANK_TONES[r.rank - 1] ?? 'text-muted-foreground',
              )}
            >
              {r.rank}
            </span>
            <Avatar seed={r.seed} />
            <span className="flex-1 truncate font-semibold">{handle(r.seed)}</span>
            {r.rank === 1 ? <Badge variant="gold">Champion</Badge> : null}
            <span className="font-mono text-sm font-bold tabular-nums text-primary">
              {r.score.toLocaleString('en-US')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
