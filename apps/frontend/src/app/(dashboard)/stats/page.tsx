'use client';

import { Badge, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Clock,
  Coins,
  Crown,
  Dice5,
  Flame,
  Gamepad2,
  Percent,
  Rocket,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { SectionHeading } from '@/components/marketing/landing-sections';
import { useGameStats } from '@/stores/game-stats';
import { usePlayerProfile } from '@/stores/player-profile';

/* -------------------------------------------------------------------------- */
/* Per-game config                                                            */
/* -------------------------------------------------------------------------- */

type GameKey = 'crash' | 'dice' | 'roulette';

const GAME_META: Record<GameKey, { label: string; icon: LucideIcon; color: string; bar: string; ring: string }> = {
  crash: { label: 'Crash', icon: Rocket, color: 'text-primary', bar: 'from-primary to-violet', ring: 'hsl(var(--primary))' },
  dice: { label: 'Dice', icon: Dice5, color: 'text-emerald', bar: 'from-emerald to-accent', ring: 'hsl(var(--emerald))' },
  roulette: { label: 'Roulette', icon: Target, color: 'text-pink', bar: 'from-pink to-violet', ring: 'hsl(var(--pink))' },
};

const GAME_KEYS: GameKey[] = ['crash', 'dice', 'roulette'];

/* -------------------------------------------------------------------------- */
/* Deterministic 7-day activity (module scope — never empty)                   */
/* -------------------------------------------------------------------------- */

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_ACTIVITY = [42, 68, 55, 91, 74, 120, 98]; // games played per day

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StatsPage() {
  const games = useGameStats((s) => s.games);
  const profile = usePlayerProfile();

  // Aggregate across the three games (guard indexes for noUncheckedIndexedAccess).
  const perGame = GAME_KEYS.map((k) => {
    const g = games[k];
    const wins = g.history.filter((r) => r.win).length;
    const played = g.history.length;
    const coinsWon = g.history.filter((r) => r.payout > 0).reduce((a, r) => a + r.payout, 0);
    return { key: k, rounds: g.rounds, played, wins, coinsWon, bestStreak: g.bestStreak, history: g.history };
  });

  const totalGames = perGame.reduce((a, g) => a + g.rounds, 0);
  const totalHistory = perGame.reduce((a, g) => a + g.played, 0);
  const totalWins = perGame.reduce((a, g) => a + g.wins, 0);
  const winRate = totalHistory > 0 ? Math.round((totalWins / totalHistory) * 100) : 0;
  const longestStreak = perGame.reduce((a, g) => Math.max(a, g.bestStreak), 0);
  const coinsWon = perGame.reduce((a, g) => a + g.coinsWon, 0);
  const achievementsUnlocked = profile.achievements.filter((a) => a.unlocked).length;
  const hoursPlayed = Math.round((profile.playMinutes / 60) * 10) / 10;

  const maxWeek = Math.max(...WEEK_ACTIVITY, 1);
  const maxRounds = Math.max(...perGame.map((g) => g.rounds), 1);

  return (
    <div className="relative space-y-10">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-40" />
      <div className="bg-aurora pointer-events-none absolute inset-0 -z-10 opacity-[0.15]" />

      {/* Header ------------------------------------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl border border-black/10 glass-strong p-6 sm:p-8">
        <div className="sheen pointer-events-none absolute inset-0" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-card/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur">
            <BarChart3 className="h-3.5 w-3.5" /> Career stats
          </span>
          <h1 className="mt-3 text-gradient font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Player Statistics
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {profile.username}&apos;s performance across every game — hours, win rate, streaks and
            more, tracked live as you play.
          </p>
        </div>
      </section>

      {/* Headline tiles ---------------------------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Clock} tone="primary" label="Hours Played" value={<AnimatedNumber value={hoursPlayed} decimals={1} suffix="h" />} delay={0} />
        <StatTile icon={Gamepad2} tone="violet" label="Total Games" value={<AnimatedNumber value={totalGames} />} delay={0.05} />
        <StatTile icon={Percent} tone="emerald" label="Win Rate" value={<AnimatedNumber value={winRate} suffix="%" />} delay={0.1} />
        <StatTile icon={Flame} tone="pink" label="Longest Streak" value={<AnimatedNumber value={longestStreak} />} delay={0.15} />
        <StatTile icon={Zap} tone="accent" label="XP Earned" value={<AnimatedNumber value={profile.xp + profile.level * 1000} />} delay={0.2} />
        <StatTile icon={Coins} tone="gold" label="Coins Won" value={<AnimatedNumber value={coinsWon} />} delay={0.25} />
        <StatTile icon={Trophy} tone="violet" label="Achievements" value={<AnimatedNumber value={achievementsUnlocked} suffix={`/${profile.achievements.length}`} />} delay={0.3} />
        <StatTile icon={Crown} tone="gold" label="Battle Pass" value={<AnimatedNumber value={profile.seasonTier} prefix="Tier " />} delay={0.35} />
      </section>

      {/* Charts row 1: games-per-game bars + win-rate ring ----------------- */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Games played per game (bar chart) */}
        <motion.section {...fade} transition={{ duration: 0.5 }} className="card-premium space-y-5 p-6">
          <SectionHeading icon={<BarChart3 className="h-5 w-5 text-primary" />} title="Games Per Game" />
          <div className="space-y-4">
            {perGame.map((g) => {
              const meta = GAME_META[g.key];
              const Icon = meta.icon;
              const pct = Math.round((g.rounds / maxRounds) * 100);
              return (
                <div key={g.key}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className={cn('inline-flex items-center gap-1.5 font-semibold', meta.color)}>
                      <Icon className="h-4 w-4" /> {meta.label}
                    </span>
                    <span className="font-mono tabular-nums text-muted-foreground">{g.rounds} rounds</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-muted/50">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn('h-full rounded-full bg-gradient-to-r shadow-glow-sm', meta.bar)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Win-rate ring */}
        <motion.section {...fade} transition={{ duration: 0.5, delay: 0.1 }} className="card-premium flex flex-col items-center justify-center gap-4 p-6">
          <SectionHeading icon={<TrendingUp className="h-5 w-5 text-emerald" />} title="Overall Win Rate" />
          <WinRateRing pct={winRate} wins={totalWins} total={totalHistory} />
          <div className="flex gap-6 text-center">
            <div>
              <p className="font-display text-xl font-bold tabular-nums text-emerald">{totalWins}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Wins</p>
            </div>
            <div>
              <p className="font-display text-xl font-bold tabular-nums text-destructive">{totalHistory - totalWins}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Losses</p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Sparklines per game ---------------------------------------------- */}
      <section className="space-y-4">
        <SectionHeading icon={<Activity className="h-5 w-5 text-accent" />} title="Recent Form · Last 20 Results" />
        <div className="grid gap-4 lg:grid-cols-3">
          {perGame.map((g, i) => {
            const meta = GAME_META[g.key];
            const Icon = meta.icon;
            const wr = g.played > 0 ? Math.round((g.wins / g.played) * 100) : 0;
            return (
              <motion.div
                key={g.key}
                {...fade}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="card-premium space-y-3 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className={cn('inline-flex items-center gap-2 font-display text-base font-bold', meta.color)}>
                    <Icon className="h-5 w-5" /> {meta.label}
                  </span>
                  <Badge variant="neon">{wr}% win</Badge>
                </div>
                <Sparkline history={g.history} stroke={meta.ring} />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono tabular-nums">{g.wins}W / {g.played - g.wins}L</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 text-gold" /> best streak {g.bestStreak}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 7-day activity bar chart ----------------------------------------- */}
      <motion.section {...fade} transition={{ duration: 0.5 }} className="card-premium space-y-5 p-6">
        <SectionHeading icon={<Activity className="h-5 w-5 text-violet" />} title="7-Day Activity" />
        <div className="flex items-end justify-between gap-2 sm:gap-4" style={{ height: 200 }}>
          {WEEK_ACTIVITY.map((v, i) => {
            const pct = Math.round((v / maxWeek) * 100);
            const label = WEEK_LABELS[i] ?? '';
            const isPeak = v === maxWeek;
            return (
              <div key={label} className="flex flex-1 flex-col items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">{v}</span>
                <div className="flex w-full flex-1 items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
                    className={cn(
                      'w-full rounded-t-lg bg-gradient-to-t',
                      isPeak ? 'from-gold to-warning shadow-glow-gold' : 'from-primary to-violet shadow-glow-sm',
                    )}
                  />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat tile                                                                  */
/* -------------------------------------------------------------------------- */

const TILE_TONE: Record<string, { chip: string; text: string }> = {
  primary: { chip: 'bg-primary/15 text-primary shadow-glow-sm', text: 'text-gradient' },
  violet: { chip: 'bg-violet/15 text-violet shadow-glow-sm', text: 'text-gradient' },
  emerald: { chip: 'bg-emerald/15 text-emerald shadow-glow-sm', text: 'text-gradient' },
  pink: { chip: 'bg-pink/15 text-pink shadow-glow-sm', text: 'text-gradient' },
  accent: { chip: 'bg-accent/15 text-accent shadow-glow-sm', text: 'text-gradient' },
  gold: { chip: 'bg-gradient-gold text-gold-foreground shadow-glow-gold', text: 'text-gradient-gold' },
};

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  tone: keyof typeof TILE_TONE;
  delay: number;
}) {
  const t = TILE_TONE[tone] ?? TILE_TONE.primary!;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay }}
      className="card-premium sheen flex items-center gap-3 p-5"
    >
      <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', t.chip)}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className={cn('font-display text-2xl font-bold tabular-nums', t.text)}>{value}</p>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Win-rate ring (SVG)                                                        */
/* -------------------------------------------------------------------------- */

function WinRateRing({ pct }: { pct: number; wins: number; total: number }) {
  const size = 180;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} opacity={0.5} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#winGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="winGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--emerald))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-black tabular-nums text-gradient">
          <AnimatedNumber value={pct} suffix="%" />
        </span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">win rate</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sparkline (SVG polyline over last-20 results)                              */
/* -------------------------------------------------------------------------- */

function Sparkline({ history, stroke }: { history: { win: boolean; value: number }[]; stroke: string }) {
  const W = 260;
  const H = 56;
  // Oldest -> newest for left-to-right reading; history is newest-first.
  const pts = [...history].reverse();
  const n = pts.length;
  if (n === 0) {
    return <div className="h-14 rounded-lg bg-muted/40" />;
  }
  const max = Math.max(...pts.map((p) => p.value), 1);
  const min = Math.min(...pts.map((p) => p.value), 0);
  const range = max - min || 1;
  const coords = pts.map((p, i) => {
    const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
    const y = H - 6 - ((p.value - min) / range) * (H - 12);
    return { x, y, win: p.win };
  });
  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${stroke}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#spark-${stroke})`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: 'easeInOut' }}
      />
      {coords.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2.4}
          fill={p.win ? 'hsl(var(--emerald))' : 'hsl(var(--destructive))'}
        />
      ))}
    </svg>
  );
}
