'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import {
  Calendar,
  Coins,
  Crown,
  Flame,
  Gem,
  Sparkles,
  Timer,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { AnimatedNumber } from './animated-number';
import { SectionHeading } from './landing-sections';

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

const GRADIENTS = [
  'from-primary to-violet',
  'from-gold to-warning',
  'from-emerald to-accent',
  'from-pink to-violet',
  'from-accent to-primary',
  'from-destructive to-warning',
  'from-violet to-pink',
  'from-primary to-emerald',
];

/** Deterministic gradient by index. */
function grad(i: number): string {
  return GRADIENTS[i % GRADIENTS.length]!;
}

function initials(name: string): string {
  return name.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 2).toUpperCase();
}

/** A gradient avatar circle with initials. */
function Avatar({ name, index, className }: { name: string; index: number; className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white',
        grad(index),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Horizontal Netflix-style scroll row wrapper. */
function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3">{children}</div>
  );
}

function fadeUp(i: number) {
  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true } as const,
    transition: { duration: 0.4, delay: Math.min(i, 6) * 0.05 },
  };
}

/* -------------------------------------------------------------------------- */
/* 2. Big winners                                                            */
/* -------------------------------------------------------------------------- */

interface BigWin {
  name: string;
  flag: string;
  game: string;
  payout: number;
  multiplier: number;
}

const BIG_WINS: BigWin[] = [
  { name: 'Phoenix', flag: '🇺🇸', game: 'Crash', payout: 124500, multiplier: 24.9 },
  { name: 'NovaQueen', flag: '🇬🇧', game: 'Roulette', payout: 82300, multiplier: 36 },
  { name: 'GoldRush', flag: '🇩🇪', game: 'Blackjack', payout: 215000, multiplier: 12.4 },
  { name: 'Vortex', flag: '🇧🇷', game: 'Dice', payout: 31200, multiplier: 9.8 },
  { name: 'Lumen', flag: '🇯🇵', game: 'Teen Patti', payout: 156400, multiplier: 48 },
  { name: 'Mirage', flag: '🇫🇷', game: 'Gates of Olympus', payout: 98700, multiplier: 21.5 },
  { name: 'Apex', flag: '🇨🇦', game: 'Plinko', payout: 43000, multiplier: 7.2 },
  { name: 'Zenith', flag: '🇦🇺', game: 'Crash', payout: 54000, multiplier: 15.1 },
];

export function BigWinners() {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Flame className="h-5 w-5 text-pink" />}
        title="Big winners"
        action={{ label: 'Leaderboard', href: '/leaderboards' }}
      />
      <ScrollRow>
        {BIG_WINS.map((w, i) => (
          <motion.div key={w.name + i} {...fadeUp(i)} className="w-64 shrink-0 snap-start">
            <div className="card-premium sheen group h-full overflow-hidden p-5">
              <div className="flex items-center gap-3">
                <Avatar name={w.name} index={i} className="h-11 w-11" />
                <div className="min-w-0 leading-tight">
                  <p className="flex items-center gap-1.5 truncate font-display text-sm font-bold">
                    {w.name} <span aria-hidden>{w.flag}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{w.game}</p>
                </div>
                <Badge variant="hot" className="ml-auto shrink-0 font-mono tabular-nums">
                  {w.multiplier.toFixed(1)}×
                </Badge>
              </div>
              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Payout</p>
                <p className="font-display text-2xl font-bold text-emerald">
                  <AnimatedNumber value={w.payout} prefix="$" className="font-mono tabular-nums" />
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </ScrollRow>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Jackpot winners                                                        */
/* -------------------------------------------------------------------------- */

interface JackpotWin {
  name: string;
  flag: string;
  game: string;
  amount: number;
  ago: string;
}

const JACKPOT_WINS: JackpotWin[] = [
  { name: 'DragonLord', flag: '🇸🇬', game: 'Mega Moolah', amount: 482300, ago: '2m ago' },
  { name: 'StarFall', flag: '🇮🇳', game: 'Divine Fortune', amount: 264500, ago: '14m ago' },
  { name: 'CrownJewel', flag: '🇪🇸', game: 'Gates of Olympus', amount: 156900, ago: '38m ago' },
  { name: 'Tempest', flag: '🇳🇱', game: 'Hall of Gods', amount: 318700, ago: '1h ago' },
  { name: 'Solaris', flag: '🇮🇹', game: 'Mega Fortune', amount: 209400, ago: '2h ago' },
  { name: 'Nebula', flag: '🇵🇹', game: 'Arabian Nights', amount: 143200, ago: '3h ago' },
];

export function JackpotWinners() {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Coins className="h-5 w-5 text-gold" />}
        title="Recently won jackpots"
        action={{ label: 'All jackpots', href: '/games?sort=popular' }}
      />
      <ScrollRow>
        {JACKPOT_WINS.map((w, i) => (
          <motion.div key={w.name + i} {...fadeUp(i)} className="w-72 shrink-0 snap-start">
            <div className="sheen group relative h-full overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/10 via-card/60 to-warning/10 p-5 shadow-glow-gold">
              <div className="bg-grid absolute inset-0 opacity-30" aria-hidden />
              <div className="bg-aurora absolute inset-0 opacity-10" aria-hidden />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <Badge variant="jackpot" className="gap-1">
                    <Crown className="h-3 w-3" /> Jackpot
                  </Badge>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Timer className="h-3 w-3" /> {w.ago}
                  </span>
                </div>
                <div className="mt-4 font-display text-3xl font-bold tracking-tight">
                  <span className="text-gradient-gold">
                    <AnimatedNumber value={w.amount} prefix="$" className="font-mono tabular-nums" />
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar name={w.name} index={i + 3} className="h-9 w-9" />
                  <div className="min-w-0 leading-tight">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {w.name} <span aria-hidden>{w.flag}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{w.game}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </ScrollRow>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Live tournaments                                                       */
/* -------------------------------------------------------------------------- */

interface Tourney {
  name: string;
  game: string;
  prize: number;
  players: number;
  starts: string;
  live: boolean;
}

const TOURNEYS: Tourney[] = [
  { name: 'Weekend Showdown', game: 'Crash', prize: 1000000, players: 12480, starts: 'Live', live: true },
  { name: 'Crash Race', game: 'Crash', prize: 50000, players: 6240, starts: '02:14:30', live: false },
  { name: 'High Roller Cup', game: 'Blackjack', prize: 250000, players: 1820, starts: '05:41:12', live: false },
  { name: 'Dice Masters', game: 'Dice', prize: 75000, players: 3960, starts: '12:08:55', live: false },
  { name: 'Roulette Royale', game: 'Roulette', prize: 120000, players: 2740, starts: '18:22:40', live: false },
];

export function LiveTournaments() {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Trophy className="h-5 w-5 text-violet" />}
        title="Live tournaments"
        action={{ label: 'All tournaments', href: '/tournaments' }}
      />
      <ScrollRow>
        {TOURNEYS.map((t, i) => (
          <motion.div key={t.name + i} {...fadeUp(i)} className="w-72 shrink-0 snap-start">
            <div className="card-premium sheen relative flex h-full flex-col overflow-hidden p-5">
              <div className={cn('absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-20 blur-2xl', grad(i + 1))} />
              <div className="relative flex items-center justify-between">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-glow-sm', grad(i + 1))}>
                  <Trophy className="h-5 w-5" />
                </span>
                {t.live ? (
                  <Badge variant="live" className="gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> Live
                  </Badge>
                ) : (
                  <span className="flex items-center gap-1 rounded-full border border-black/10 bg-card/60 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-foreground">
                    <Timer className="h-3 w-3 text-violet" /> {t.starts}
                  </span>
                )}
              </div>
              <h3 className="relative mt-4 font-display text-base font-bold">{t.name}</h3>
              <p className="relative text-xs text-muted-foreground">{t.game} tournament</p>
              <div className="relative mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Prize pool</p>
                  <p className="font-display text-xl font-bold">
                    <span className="text-gradient-gold">
                      <AnimatedNumber value={t.prize} prefix="$" className="font-mono tabular-nums" />
                    </span>
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-mono tabular-nums">{t.players.toLocaleString('en-US')}</span>
                </span>
              </div>
              <Button asChild variant="gradient" size="sm" className="relative mt-4 w-full">
                <Link href="/tournaments">Register</Link>
              </Button>
            </div>
          </motion.div>
        ))}
      </ScrollRow>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Sports highlights                                                      */
/* -------------------------------------------------------------------------- */

interface Match {
  league: string;
  home: string;
  away: string;
  scoreHome: number | null;
  scoreAway: number | null;
  status: string;
  live: boolean;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
}

const MATCHES: Match[] = [
  { league: 'Premier League', home: 'Arsenal', away: 'Everton', scoreHome: 3, scoreAway: 0, status: "72'", live: true, oddsHome: 1.18, oddsDraw: 7.5, oddsAway: 14.0 },
  { league: 'NBA', home: 'Boston', away: 'Miami', scoreHome: 88, scoreAway: 84, status: 'Q3', live: true, oddsHome: 1.45, oddsDraw: 0, oddsAway: 2.8 },
  { league: 'La Liga', home: 'Madrid', away: 'Sevilla', scoreHome: null, scoreAway: null, status: 'Today 21:00', live: false, oddsHome: 1.62, oddsDraw: 3.9, oddsAway: 5.1 },
  { league: 'Ligue 1', home: 'PSG', away: 'Lyon', scoreHome: 1, scoreAway: 1, status: "58'", live: true, oddsHome: 1.33, oddsDraw: 5.2, oddsAway: 8.4 },
  { league: 'NHL', home: 'Kings', away: 'Sharks', scoreHome: null, scoreAway: null, status: 'Tmrw 03:00', live: false, oddsHome: 2.1, oddsDraw: 4.0, oddsAway: 1.9 },
];

function OddsChip({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <span className="flex flex-1 flex-col items-center rounded-lg border border-black/10 bg-card/60 px-2 py-1.5 transition-colors hover:border-accent/50 hover:bg-accent/5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-bold tabular-nums text-foreground">{value.toFixed(2)}</span>
    </span>
  );
}

function Crest({ name, index }: { name: string; index: number }) {
  return <Avatar name={name} index={index} className="h-8 w-8 ring-2 ring-white/40" />;
}

export function SportsHighlights() {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Flame className="h-5 w-5 text-accent" />}
        title="Sports highlights"
        action={{ label: 'All sports', href: '/sportsbook' }}
      />
      <ScrollRow>
        {MATCHES.map((m, i) => (
          <motion.div key={m.home + m.away + i} {...fadeUp(i)} className="w-80 shrink-0 snap-start">
            <Link href="/sportsbook" className="group block h-full">
              <div className="card-premium sheen flex h-full flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.league}
                  </span>
                  {m.live ? (
                    <Badge variant="live" className="gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> {m.status}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">{m.status}</span>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Crest name={m.home} index={i} />
                    <span className="flex-1 truncate text-sm font-semibold">{m.home}</span>
                    {m.scoreHome !== null && (
                      <span className="font-mono text-lg font-bold tabular-nums">{m.scoreHome}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Crest name={m.away} index={i + 4} />
                    <span className="flex-1 truncate text-sm font-semibold">{m.away}</span>
                    {m.scoreAway !== null && (
                      <span className="font-mono text-lg font-bold tabular-nums">{m.scoreAway}</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <OddsChip label="1" value={m.oddsHome} />
                  <OddsChip label="X" value={m.oddsDraw} />
                  <OddsChip label="2" value={m.oddsAway} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </ScrollRow>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 6a. VIP games                                                             */
/* -------------------------------------------------------------------------- */

interface VipGame {
  name: string;
  tag: string;
  minBet: number;
  players: number;
}

const VIP_GAMES: VipGame[] = [
  { name: 'Diamond Baccarat', tag: 'Exclusive', minBet: 500, players: 184 },
  { name: 'Salon Privé Roulette', tag: 'High limit', minBet: 1000, players: 96 },
  { name: 'Black Blackjack', tag: 'VIP', minBet: 750, players: 142 },
  { name: 'Royal Crash', tag: 'Whale', minBet: 2000, players: 58 },
  { name: 'Platinum Dragon Tiger', tag: 'Exclusive', minBet: 600, players: 120 },
  { name: 'Imperial Poker', tag: 'VIP', minBet: 1500, players: 74 },
];

export function VIPGames() {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Gem className="h-5 w-5 text-violet" />}
        title="VIP games"
        action={{ label: 'VIP lounge', href: '/rewards' }}
      />
      <ScrollRow>
        {VIP_GAMES.map((g, i) => (
          <motion.div key={g.name + i} {...fadeUp(i)} className="w-60 shrink-0 snap-start">
            <Link href="/casino" className="group block h-full">
              <div className="card-premium sheen overflow-hidden p-0">
                <div className={cn('relative h-24 bg-gradient-to-br', grad(i + 2))}>
                  <div className="bg-grid absolute inset-0 opacity-30" />
                  <Badge variant="gold" className="absolute right-3 top-3 text-[10px]">
                    {g.tag}
                  </Badge>
                  <Gem className="absolute -bottom-3 left-4 h-16 w-16 text-white/90 drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div className="space-y-3 p-4">
                  <p className="font-display text-base font-bold">{g.name}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-muted-foreground">Min bet</p>
                      <p className="font-mono font-semibold tabular-nums text-gold">
                        ${g.minBet.toLocaleString('en-US')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">At table</p>
                      <p className="font-mono font-semibold tabular-nums text-foreground">
                        {g.players}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </ScrollRow>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 6b. Upcoming events                                                       */
/* -------------------------------------------------------------------------- */

interface GameEvent {
  title: string;
  desc: string;
  date: string;
  month: string;
  day: string;
  icon: typeof Trophy;
  accent: string;
}

const EVENTS: GameEvent[] = [
  { title: 'Mega Jackpot Drop', desc: 'Guaranteed $2M must-drop across all slots.', date: 'Fri 20:00', month: 'JUL', day: '04', icon: Coins, accent: 'from-gold to-warning' },
  { title: 'Champions Crash Final', desc: 'Top 100 battle for the season trophy.', date: 'Sat 18:00', month: 'JUL', day: '05', icon: Trophy, accent: 'from-primary to-violet' },
  { title: 'Live Dealer Night', desc: 'Double comp points on all live tables.', date: 'Sun 21:00', month: 'JUL', day: '06', icon: Sparkles, accent: 'from-emerald to-accent' },
  { title: 'High Roller Gala', desc: 'Invite-only VIP tournament, $500K pool.', date: 'Wed 22:00', month: 'JUL', day: '09', icon: Crown, accent: 'from-pink to-violet' },
];

export function UpcomingEvents() {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Calendar className="h-5 w-5 text-primary" />}
        title="Upcoming events"
        action={{ label: 'Full calendar', href: '/tournaments' }}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EVENTS.map((e, i) => {
          const Icon = e.icon;
          return (
            <motion.div key={e.title + i} {...fadeUp(i)} className="card-premium sheen group relative overflow-hidden p-5">
              <div className={cn('absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity group-hover:opacity-40', e.accent)} />
              <div className="relative flex items-start gap-4">
                <div className="flex flex-col items-center rounded-xl border border-black/10 bg-card/60 px-3 py-2 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink">{e.month}</span>
                  <span className="font-display text-xl font-bold leading-none">{e.day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white', e.accent)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="truncate font-display text-sm font-bold">{e.title}</h3>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{e.desc}</p>
                  <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-accent">
                    <Timer className="h-3 w-3" /> {e.date}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
