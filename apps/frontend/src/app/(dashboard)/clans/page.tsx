'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import {
  Award,
  Calendar,
  Crown,
  Flame,
  Gem,
  Medal,
  MessageSquare,
  Rocket,
  Send,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { SectionHeading } from '@/components/marketing/landing-sections';
import {
  avatarGradient,
  flagFor,
  friends,
  initials,
  topPlayers,
} from '@/lib/ecosystem-data';
import { usePlayerProfile } from '@/stores/player-profile';

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

const ICONS: Record<string, LucideIcon> = {
  Trophy,
  Sparkles,
  Rocket,
  Crown,
  Flame,
  Swords,
  Target,
  Gem,
  Zap,
  Shield,
};
function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

/* -------------------------------------------------------------------------- */
/* Deterministic clan data (module scope — never empty)                        */
/* -------------------------------------------------------------------------- */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Role = 'Leader' | 'Officer' | 'Member';

interface Member {
  name: string;
  seed: string;
  flag: string;
  level: number;
  role: Role;
  online: boolean;
  contribution: number;
}

/** ~16 deterministic members reusing friends() + topPlayers() names. */
function buildRoster(): Member[] {
  const fr = friends();
  const tp = topPlayers();
  const pool = [
    ...fr.map((f) => ({ name: f.name, seed: f.seed })),
    ...tp.map((p) => ({ name: p.name, seed: `clan-${p.seed}` })),
  ].slice(0, 16);

  return pool.map((p, i) => {
    const h = hash(p.seed);
    const role: Role = i === 0 ? 'Leader' : i < 4 ? 'Officer' : 'Member';
    return {
      name: p.name,
      seed: p.seed,
      flag: flagFor(p.seed),
      level: 12 + (h % 78),
      role,
      online: h % 3 !== 0,
      contribution: 1200 + (h % 48000),
    };
  });
}

interface ClanMission {
  id: string;
  name: string;
  icon: string;
  current: number;
  goal: number;
  reward: string;
}
const CLAN_MISSIONS: ClanMission[] = [
  { id: 'm1', name: 'Win 500 Crash rounds', icon: 'Rocket', current: 372, goal: 500, reward: '5,000 Clan XP' },
  { id: 'm2', name: 'Wager 2M coins together', icon: 'Gem', current: 1_640_000, goal: 2_000_000, reward: 'Legendary Frame' },
  { id: 'm3', name: 'Reach Top 10 leaderboard', icon: 'Trophy', current: 14, goal: 10, reward: 'Clan Banner' },
  { id: 'm4', name: 'Play 1,000 games this week', icon: 'Target', current: 812, goal: 1000, reward: '10,000 Coins' },
];

interface ClanAchievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  rarity: 'rare' | 'epic' | 'legendary';
}
const CLAN_ACHIEVEMENTS: ClanAchievement[] = [
  { id: 'a1', title: 'Tournament Titans', desc: 'Won a clan tournament', icon: 'Trophy', rarity: 'legendary' },
  { id: 'a2', title: 'Crash Dynasty', desc: '10,000 crash wins as a clan', icon: 'Rocket', rarity: 'epic' },
  { id: 'a3', title: 'Unbroken', desc: '30-day activity streak', icon: 'Flame', rarity: 'rare' },
  { id: 'a4', title: 'War Machine', desc: 'Won 5 clan wars', icon: 'Swords', rarity: 'epic' },
];

interface ClanEvent {
  id: string;
  name: string;
  desc: string;
  icon: string;
  gradient: string;
  seconds: number;
  reward: string;
}
const CLAN_EVENTS: ClanEvent[] = [
  { id: 'e1', name: 'Clan War: Void Reapers', desc: 'Head-to-head crash battle', icon: 'Swords', gradient: 'from-primary to-violet', seconds: 3 * 3600 + 720, reward: '50,000 Clan XP' },
  { id: 'e2', name: 'Weekend Raid', desc: 'Co-op wagering challenge', icon: 'Flame', gradient: 'from-gold to-warning', seconds: 26 * 3600, reward: 'Legendary Loot' },
  { id: 'e3', name: 'Season Finale', desc: 'Final push for Diamond', icon: 'Crown', gradient: 'from-pink to-violet', seconds: 72 * 3600, reward: 'Diamond Emblem' },
];

interface BrowseClan {
  name: string;
  tag: string;
  gradient: string;
  members: number;
  level: number;
  power: number;
}
const BROWSE_CLANS: BrowseClan[] = [
  { name: 'Void Reapers', tag: 'VOID', gradient: 'from-violet to-pink', members: 48, level: 62, power: 984000 },
  { name: 'Golden Aces', tag: 'GOLD', gradient: 'from-gold to-warning', members: 41, level: 55, power: 872000 },
  { name: 'Crash Cartel', tag: 'CRSH', gradient: 'from-primary to-emerald', members: 39, level: 51, power: 810000 },
  { name: 'Neon Vipers', tag: 'VIPR', gradient: 'from-accent to-primary', members: 44, level: 58, power: 921000 },
  { name: 'Lucky Legion', tag: 'LUCK', gradient: 'from-emerald to-accent', members: 36, level: 47, power: 703000 },
  { name: 'Phantom Elite', tag: 'PHNT', gradient: 'from-pink to-violet', members: 50, level: 66, power: 1040000 },
];

const SEED_MESSAGES: { name: string; seed: string; text: string; mins: number }[] = [
  { name: 'NovaStrike', seed: 'NovaStrikefr0', text: 'GG on that clan war win last night 🔥', mins: 42 },
  { name: 'CryptoFox', seed: 'CryptoFoxfr1', text: "Who's up for the Weekend Raid? Need 3 more.", mins: 31 },
  { name: 'LunaBet', seed: 'LunaBetfr2', text: 'Just hit a 24× on crash, contribution incoming 💸', mins: 18 },
  { name: 'Zenith', seed: 'Zenithfr4', text: 'Officers — mission board updated, check missions tab.', mins: 9 },
  { name: 'ApexWolf', seed: 'ApexWolffr6', text: 'lets push for Diamond this season, we got this 💪', mins: 3 },
];

/* -------------------------------------------------------------------------- */
/* Small shared bits                                                          */
/* -------------------------------------------------------------------------- */

function Avatar({ seed, name, className }: { seed: string; name: string; className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white',
        avatarGradient(seed),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

function Countdown({ seconds, className }: { seconds: number; className?: string }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    const id = setInterval(() => setRemaining((r) => (r <= 1 ? seconds : r - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    <span className={cn('font-mono font-semibold tabular-nums', className)}>
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

const RARITY: Record<ClanAchievement['rarity'], { chip: string; label: string; badge: 'featured' | 'gold' | 'neon' }> = {
  rare: { chip: 'bg-accent/15 text-accent shadow-glow-sm', label: 'Rare', badge: 'neon' },
  epic: { chip: 'bg-violet/15 text-violet shadow-glow-sm', label: 'Epic', badge: 'featured' },
  legendary: { chip: 'bg-gradient-gold text-gold-foreground shadow-glow-gold', label: 'Legendary', badge: 'gold' },
};

const ROLE_STYLE: Record<Role, { chip: string; icon: LucideIcon }> = {
  Leader: { chip: 'bg-gradient-gold text-gold-foreground shadow-glow-gold', icon: Crown },
  Officer: { chip: 'bg-violet/15 text-violet', icon: Medal },
  Member: { chip: 'bg-muted/40 text-muted-foreground', icon: Users },
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ClansPage() {
  const profile = usePlayerProfile();
  const clan = profile.clan ?? { name: 'Neon Syndicate', tag: 'NEON' };
  const roster = useMemo(() => buildRoster(), []);
  const leader = roster[0];
  const online = roster.filter((m) => m.online).length;

  const clanLevel = 58;
  const clanXp = 742_000;
  const clanXpToNext = 1_000_000;
  const xpPct = Math.round((clanXp / clanXpToNext) * 100);

  return (
    <div className="relative space-y-10">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-40" />
      <div className="bg-aurora pointer-events-none absolute inset-0 -z-10 opacity-[0.15]" />

      {/* Hero -------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-black/10 glass-strong p-6 sm:p-8">
        <div className="sheen pointer-events-none absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-primary/25 via-violet/20 to-pink/20"
        >
          <div className="bg-grid absolute inset-0 opacity-30" />
        </motion.div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Emblem */}
          <motion.div
            initial={{ opacity: 0, rotate: -8, scale: 0.9 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 12 }}
            className={cn(
              'relative flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br shadow-glow',
              'from-primary to-violet',
            )}
          >
            <div className="bg-grid absolute inset-0 rounded-3xl opacity-30" />
            <span className="sheen pointer-events-none absolute inset-0 rounded-3xl" />
            <span className="relative font-display text-3xl font-black tracking-tight text-white drop-shadow">
              {clan.tag}
            </span>
            <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-gold text-gold-foreground shadow-glow-gold">
              <Shield className="h-4.5 w-4.5" />
            </span>
          </motion.div>

          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-card/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur">
              <Users className="h-3.5 w-3.5" /> Your Clan
            </span>
            <h1 className="mt-2 text-gradient font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {clan.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-gold" /> Leader:{' '}
                <span className="font-semibold text-foreground">{leader?.name ?? 'Nova'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{roster.length}</span> members ·{' '}
                <span className="font-semibold text-emerald">{online}</span> online
              </span>
            </p>

            {/* Clan level + XP bar */}
            <div className="mt-4 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <Star className="h-3.5 w-3.5 text-gold" /> Clan Level {clanLevel}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  <AnimatedNumber value={clanXp} /> / {clanXpToNext.toLocaleString()} XP
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-primary via-violet to-pink shadow-glow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <StatChip icon={<Trophy className="h-5 w-5" />} tone="gold" label="Clan Rank" value={<AnimatedNumber value={14} prefix="#" />} />
          <StatChip icon={<Swords className="h-5 w-5" />} tone="primary" label="Wars Won" value={<AnimatedNumber value={37} />} />
          <StatChip icon={<Flame className="h-5 w-5" />} tone="emerald" label="Weekly Wins" value={<AnimatedNumber value={1284} live />} />
        </div>
      </section>

      {/* Roster ------------------------------------------------------------ */}
      <section className="space-y-4">
        <SectionHeading icon={<Users className="h-5 w-5 text-primary" />} title="Members" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((m, i) => {
            const rs = ROLE_STYLE[m.role];
            const RoleIcon = rs.icon;
            return (
              <motion.div
                key={m.seed}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.4) }}
                className="glass flex items-center gap-3 rounded-2xl border border-black/10 p-3.5"
              >
                <div className="relative">
                  <Avatar seed={m.seed} name={m.name} className="h-11 w-11 text-sm" />
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card',
                      m.online ? 'bg-emerald' : 'bg-muted-foreground/40',
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                    <span className="text-base leading-none">{m.flag}</span>
                    {m.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Level {m.level} · {m.contribution.toLocaleString()} pts
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
                    rs.chip,
                  )}
                >
                  <RoleIcon className="h-3 w-3" /> {m.role}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Missions ---------------------------------------------------------- */}
      <section className="space-y-4">
        <SectionHeading icon={<Target className="h-5 w-5 text-accent" />} title="Clan Missions" />
        <div className="grid gap-4 sm:grid-cols-2">
          {CLAN_MISSIONS.map((m, i) => {
            const Icon = iconFor(m.icon);
            const pct = Math.min(100, Math.round((m.current / m.goal) * 100));
            const done = m.current >= m.goal;
            return (
              <motion.div
                key={m.id}
                {...fadeUp}
                transition={{ duration: 0.45, delay: Math.min(i * 0.06, 0.3) }}
                className="card-premium flex flex-col gap-3 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-glow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold">{m.name}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-gold">
                      <Gem className="h-3 w-3" /> {m.reward}
                    </p>
                  </div>
                  {done ? <Badge variant="success">Complete</Badge> : null}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] font-mono tabular-nums text-muted-foreground">
                    <span>{m.current.toLocaleString()} / {m.goal.toLocaleString()}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        done ? 'bg-emerald' : 'bg-gradient-to-r from-accent to-primary',
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Achievements + Events grid --------------------------------------- */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <SectionHeading icon={<Award className="h-5 w-5 text-violet" />} title="Clan Achievements" />
          <div className="grid gap-3">
            {CLAN_ACHIEVEMENTS.map((a, i) => {
              const Icon = iconFor(a.icon);
              const r = RARITY[a.rarity];
              return (
                <motion.div
                  key={a.id}
                  {...fadeUp}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
                  className="card-premium flex items-center gap-4 p-4"
                >
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', r.chip)}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-display text-base font-bold">{a.title}</h3>
                      <Badge variant={r.badge}>{r.label}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{a.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading icon={<Calendar className="h-5 w-5 text-pink" />} title="Clan Events" />
          <div className="grid gap-3">
            {CLAN_EVENTS.map((ev, i) => {
              const Icon = iconFor(ev.icon);
              return (
                <motion.div
                  key={ev.id}
                  {...fadeUp}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
                  className="card-premium relative flex items-center gap-4 overflow-hidden p-4"
                >
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-glow-sm', ev.gradient)}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-bold">{ev.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{ev.desc}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 font-semibold text-gold">
                        <Trophy className="h-3 w-3" /> {ev.reward}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Starts in</p>
                    <Countdown seconds={ev.seconds} className="text-sm text-foreground" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Clan chat --------------------------------------------------------- */}
      <ClanChat roster={roster} />

      {/* Browse other clans ------------------------------------------------ */}
      <section className="space-y-4">
        <SectionHeading icon={<Swords className="h-5 w-5 text-emerald" />} title="Browse Clans" />
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {BROWSE_CLANS.map((c, i) => (
            <motion.div
              key={c.tag}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
              className="card-premium sheen flex w-60 shrink-0 flex-col items-center gap-2 p-5 text-center"
            >
              <span className={cn('relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-lg font-black text-white shadow-glow-sm', c.gradient)}>
                <span className="bg-grid absolute inset-0 rounded-2xl opacity-30" />
                <span className="relative">{c.tag}</span>
              </span>
              <p className="font-display text-base font-bold">{c.name}</p>
              <p className="text-[11px] text-muted-foreground">
                Level {c.level} · {c.members} members
              </p>
              <p className="inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-primary">
                <Zap className="h-3 w-3" /> {c.power.toLocaleString()} power
              </p>
              <Button
                size="sm"
                variant="glass"
                className="mt-1 w-full sheen"
                onClick={() => toast.success(`Join request sent to ${c.name}`, { description: `[${c.tag}] will review your application.` })}
              >
                Join Clan
              </Button>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat chip                                                                  */
/* -------------------------------------------------------------------------- */

function StatChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: 'gold' | 'primary' | 'emerald';
}) {
  const toneCls =
    tone === 'gold'
      ? 'bg-gradient-gold text-gold-foreground shadow-glow-gold'
      : tone === 'emerald'
        ? 'bg-emerald/15 text-emerald shadow-glow-sm'
        : 'bg-primary/15 text-primary shadow-glow-sm';
  const textCls = tone === 'gold' ? 'text-gradient-gold' : 'text-gradient';
  return (
    <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneCls)}>{icon}</span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className={cn('font-display text-2xl font-bold tabular-nums', textCls)}>{value}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Clan Chat (prototype — local only, no backend)                             */
/* -------------------------------------------------------------------------- */

interface ChatMessage {
  id: number;
  name: string;
  seed: string;
  text: string;
  mine: boolean;
  mins: number;
}

function ClanChat({ roster }: { roster: Member[] }) {
  const username = usePlayerProfile((s) => s.username);
  const avatarSeed = usePlayerProfile((s) => s.avatarSeed);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    SEED_MESSAGES.map((m, i) => ({ id: i, name: m.name, seed: m.seed, text: m.text, mine: false, mins: m.mins })),
  );
  const [draft, setDraft] = useState('');
  const nextId = useRef(SEED_MESSAGES.length);
  const listRef = useRef<HTMLDivElement>(null);

  const online = roster.filter((m) => m.online).length;

  function send() {
    const text = draft.trim();
    if (!text) return;
    const id = nextId.current++;
    setMessages((prev) => [...prev, { id, name: username, seed: avatarSeed, text, mine: true, mins: 0 }]);
    setDraft('');
    toast.success('Message sent', { description: 'Posted to clan chat (prototype).' });
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  }

  return (
    <section className="space-y-4">
      <SectionHeading icon={<MessageSquare className="h-5 w-5 text-primary" />} title="Clan Chat" />
      <div className="card-premium overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" /> Neon Syndicate Lounge
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald">
            <span className="h-2 w-2 rounded-full bg-emerald" /> {online} online · prototype
          </span>
        </div>

        <div ref={listRef} className="max-h-96 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn('flex items-end gap-2.5', m.mine && 'flex-row-reverse')}
            >
              <Avatar seed={m.seed} name={m.name} className="h-8 w-8 text-[11px]" />
              <div className={cn('max-w-[75%]', m.mine && 'text-right')}>
                <p className="mb-0.5 text-[11px] text-muted-foreground">
                  {m.mine ? 'You' : m.name}
                  {m.mins > 0 ? <span className="ml-1.5">· {m.mins}m ago</span> : <span className="ml-1.5">· now</span>}
                </p>
                <div
                  className={cn(
                    'inline-block rounded-2xl px-3.5 py-2 text-sm',
                    m.mine
                      ? 'bg-gradient-to-r from-primary to-violet text-white shadow-glow-sm'
                      : 'glass border border-black/10 text-foreground',
                  )}
                >
                  {m.text}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-t border-black/5 px-4 py-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message your clan…"
            maxLength={240}
            className="h-11 flex-1 rounded-xl border border-black/10 bg-card/60 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:shadow-glow-sm"
          />
          <Button type="submit" variant="gradient" className="sheen h-11 px-4" disabled={!draft.trim()}>
            <Send className="h-4 w-4" /> Send
          </Button>
        </form>
      </div>
    </section>
  );
}
