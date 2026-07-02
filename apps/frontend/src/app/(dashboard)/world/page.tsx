'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Dumbbell,
  Gamepad2,
  Landmark,
  MapPin,
  Medal,
  Rocket,
  ShoppingBag,
  Spade,
  Sparkles,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { AnimatedNumber } from '@/components/marketing/animated-number';

/* -------------------------------------------------------------------------- */
/*  Deterministic seed helper (no Math.random / Date.now at module scope).    */
/* -------------------------------------------------------------------------- */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic "live players" number seeded from a district name. */
function seededPlayers(name: string): number {
  return 420 + (hash(name) % 9200);
}

/* -------------------------------------------------------------------------- */
/*  District model                                                            */
/* -------------------------------------------------------------------------- */
type Accent = 'primary' | 'accent' | 'gold' | 'emerald' | 'pink' | 'violet';

interface District {
  name: string;
  href: string;
  tagline: string;
  icon: LucideIcon;
  accent: Accent;
  /** Building gradient (from → to) using design tokens. */
  gradient: string;
  /** Relative building height in the skyline (rem). */
  height: number;
  /** Neon sign glyph badge label. */
  sign: string;
}

const DISTRICTS: readonly District[] = [
  {
    name: 'Casino District',
    href: '/casino',
    tagline: 'High-stakes tables & jackpots under the neon.',
    icon: Spade,
    accent: 'primary',
    gradient: 'from-primary via-violet to-pink',
    height: 15,
    sign: '♠ CASINO',
  },
  {
    name: 'Arcade Zone',
    href: '/arcade',
    tagline: 'Fast pick-up-and-play skill games for everyone.',
    icon: Gamepad2,
    accent: 'accent',
    gradient: 'from-accent via-primary to-violet',
    height: 12,
    sign: '★ ARCADE',
  },
  {
    name: 'Sports Arena',
    href: '/sportsbook',
    tagline: 'Live odds and in-play action across the leagues.',
    icon: Zap,
    accent: 'emerald',
    gradient: 'from-emerald via-accent to-primary',
    height: 13.5,
    sign: '⚡ SPORTS',
  },
  {
    name: 'Tournament Hall',
    href: '/tournaments',
    tagline: 'Bracketed showdowns with escalating prize pools.',
    icon: Trophy,
    accent: 'gold',
    gradient: 'from-gold via-warning to-pink',
    height: 16.5,
    sign: '♛ ARENA',
  },
  {
    name: 'Marketplace',
    href: '/marketplace',
    tagline: 'Trade skins, boosts and rare collectibles.',
    icon: ShoppingBag,
    accent: 'pink',
    gradient: 'from-pink via-violet to-primary',
    height: 11,
    sign: '◈ MARKET',
  },
  {
    name: 'Player HQ',
    href: '/profile',
    tagline: 'Your command center — stats, loadout & progress.',
    icon: Building2,
    accent: 'violet',
    gradient: 'from-violet via-primary to-accent',
    height: 14,
    sign: '◆ HQ',
  },
  {
    name: 'Social Plaza',
    href: '/community',
    tagline: 'Meet the crew, chat and squad up.',
    icon: Users,
    accent: 'accent',
    gradient: 'from-accent via-emerald to-primary',
    height: 12.5,
    sign: '☺ PLAZA',
  },
  {
    name: 'Leaderboard Tower',
    href: '/leaderboards',
    tagline: 'Climb the ranks and claim the top spot.',
    icon: Medal,
    accent: 'gold',
    gradient: 'from-gold via-pink to-violet',
    height: 17.5,
    sign: '▲ RANKS',
  },
  {
    name: 'Hall of Fame',
    href: '/hall-of-fame',
    tagline: 'Legends immortalized in gold.',
    icon: Landmark,
    accent: 'gold',
    gradient: 'from-gold via-primary to-violet',
    height: 13,
    sign: '♜ FAME',
  },
  {
    name: 'Training Arena',
    href: '/arcade/reaction',
    tagline: 'Sharpen reflexes before you go pro.',
    icon: Dumbbell,
    accent: 'emerald',
    gradient: 'from-emerald via-accent to-violet',
    height: 11.5,
    sign: '✦ TRAIN',
  },
] as const;

/** Accent → utility class helpers so token usage stays static for Tailwind. */
const ACCENT: Record<
  Accent,
  { text: string; ring: string; glow: string; dot: string; chip: string }
> = {
  primary: {
    text: 'text-primary',
    ring: 'ring-primary/40',
    glow: 'group-hover:shadow-glow',
    dot: 'bg-primary',
    chip: 'bg-primary/10 text-primary ring-primary/30',
  },
  accent: {
    text: 'text-accent',
    ring: 'ring-accent/40',
    glow: 'group-hover:shadow-glow-neon',
    dot: 'bg-accent',
    chip: 'bg-accent/10 text-accent ring-accent/30',
  },
  gold: {
    text: 'text-gold',
    ring: 'ring-gold/40',
    glow: 'group-hover:shadow-glow-gold',
    dot: 'bg-gold',
    chip: 'bg-gold/10 text-gold ring-gold/30',
  },
  emerald: {
    text: 'text-emerald',
    ring: 'ring-emerald/40',
    glow: 'group-hover:shadow-glow-emerald',
    dot: 'bg-emerald',
    chip: 'bg-emerald/10 text-emerald ring-emerald/30',
  },
  pink: {
    text: 'text-pink',
    ring: 'ring-pink/40',
    glow: 'group-hover:shadow-glow-pink',
    dot: 'bg-pink',
    chip: 'bg-pink/10 text-pink ring-pink/30',
  },
  violet: {
    text: 'text-violet',
    ring: 'ring-violet/40',
    glow: 'group-hover:shadow-glow',
    dot: 'bg-violet',
    chip: 'bg-violet/10 text-violet ring-violet/30',
  },
};

/* -------------------------------------------------------------------------- */
/*  Ambient sky layer: drifting clouds + flying drones/vehicles.              */
/* -------------------------------------------------------------------------- */
interface Drifter {
  top: number;
  size: number;
  duration: number;
  delay: number;
  dir: 1 | -1;
  kind: 'drone' | 'ship' | 'cloud';
}

/** Deterministically build a set of drifters from a seed string. */
function buildDrifters(seed: string, count: number, kind: Drifter['kind']): Drifter[] {
  const out: Drifter[] = [];
  for (let i = 0; i < count; i++) {
    const h = hash(`${seed}:${i}`);
    out.push({
      top: 4 + (h % 46),
      size: kind === 'cloud' ? 90 + ((h >> 4) % 140) : 26 + ((h >> 4) % 26),
      duration: 26 + ((h >> 8) % 30),
      delay: -((h >> 12) % 30),
      dir: (h & 1) === 0 ? 1 : -1,
      kind,
    });
  }
  return out;
}

const CLOUDS = buildDrifters('clouds', 5, 'cloud');
const DRONES = buildDrifters('drones', 4, 'drone');
const SHIPS = buildDrifters('ships', 3, 'ship');

function SkyLayer({ reduce }: { reduce: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Soft clouds */}
      {CLOUDS.map((c, i) => (
        <div
          key={`cloud-${i}`}
          className="absolute rounded-full bg-white/70 blur-xl"
          style={{
            top: `${c.top}%`,
            width: c.size,
            height: c.size * 0.42,
            left: c.dir === 1 ? '-20%' : '120%',
            animation: reduce
              ? undefined
              : `world-drift-${c.dir === 1 ? 'r' : 'l'} ${c.duration}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      {/* Flying vehicles / airships */}
      {SHIPS.map((s, i) => (
        <div
          key={`ship-${i}`}
          className="absolute"
          style={{
            top: `${s.top}%`,
            left: s.dir === 1 ? '-15%' : '115%',
            animation: reduce
              ? undefined
              : `world-drift-${s.dir === 1 ? 'r' : 'l'} ${s.duration}s linear ${s.delay}s infinite`,
          }}
        >
          <div
            className="flex items-center justify-center rounded-full bg-gradient-to-r from-accent/80 to-primary/80 text-white shadow-glow-neon"
            style={{ width: s.size * 1.7, height: s.size * 0.7 }}
          >
            <Rocket
              className="h-3.5 w-3.5"
              style={{ transform: `scaleX(${s.dir})` }}
            />
          </div>
        </div>
      ))}

      {/* Buzzing drones (small glowing dots with a rotor halo) */}
      {DRONES.map((d, i) => (
        <div
          key={`drone-${i}`}
          className="absolute"
          style={{
            top: `${d.top}%`,
            left: d.dir === 1 ? '-8%' : '108%',
            animation: reduce
              ? undefined
              : `world-drift-${d.dir === 1 ? 'r' : 'l'} ${d.duration}s linear ${d.delay}s infinite`,
          }}
        >
          <span
            className={cn(
              'block rounded-full bg-gradient-to-br from-pink to-violet ring-4 ring-white/50 shadow-glow-pink',
              !reduce && 'animate-glow-pulse',
            )}
            style={{ width: d.size * 0.5, height: d.size * 0.5 }}
          />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Ground / road layer: animated marching dashes.                            */
/* -------------------------------------------------------------------------- */
function GroundLayer({ reduce }: { reduce: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden" aria-hidden>
      {/* Asphalt slab with perspective glow */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/85 to-white/10 backdrop-blur-sm" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/40 via-accent/50 to-pink/40" />

      {/* Two lanes of marching dashes */}
      {[0, 1].map((lane) => (
        <div
          key={lane}
          className="absolute inset-x-0 flex items-center gap-6"
          style={{ bottom: lane === 0 ? 44 : 18 }}
        >
          <div
            className={cn('flex shrink-0 gap-6', !reduce && 'animate-marquee')}
            style={{ willChange: 'transform' }}
          >
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 w-10 rounded-full',
                  lane === 0 ? 'bg-primary/40' : 'bg-accent/40',
                )}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Rolling light "vehicle" flares along the road */}
      {!reduce &&
        [0, 1, 2].map((i) => (
          <span
            key={`flare-${i}`}
            className="absolute bottom-[38px] h-2 w-16 rounded-full bg-gradient-to-r from-transparent via-gold/80 to-transparent blur-[1px]"
            style={{
              left: '-10%',
              animation: `world-drift-r ${9 + i * 4}s linear ${-i * 3}s infinite`,
            }}
          />
        ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  District building card                                                    */
/* -------------------------------------------------------------------------- */
function DistrictBuilding({
  district,
  index,
  mx,
  my,
  reduce,
}: {
  district: District;
  index: number;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  reduce: boolean;
}) {
  const a = ACCENT[district.accent];
  const players = seededPlayers(district.name);
  // Stagger buildings vertically for a skyline feel.
  const offset = (hash(district.name) % 3) * 10;

  // Per-card parallax depth (deeper = moves more). Guarded by reduce below.
  const depth = 6 + (index % 3) * 5;
  const px = useTransform(mx, [-0.5, 0.5], [depth, -depth]);
  const py = useTransform(my, [-0.5, 0.5], [depth * 0.6, -depth * 0.6]);
  const Icon = district.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 5) * 0.06 }}
      style={reduce ? undefined : { x: px, y: py }}
      className="flex items-end"
    >
      <motion.div
        whileHover={reduce ? undefined : { y: -10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ marginTop: offset }}
        className="group w-full"
      >
        <Link
          href={district.href}
          className={cn(
            'card-premium sheen relative flex w-full flex-col overflow-hidden rounded-2xl p-0 ring-1 transition-shadow',
            a.ring,
            a.glow,
          )}
          style={{ minHeight: `${district.height}rem` }}
        >
          {/* Building "roof" gradient block with neon sign */}
          <div
            className={cn(
              'relative flex items-center justify-between gap-2 bg-gradient-to-br px-4 py-3',
              district.gradient,
            )}
          >
            {/* Neon sign — flickers on hover */}
            <span
              className={cn(
                'rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold tracking-widest text-foreground/80 shadow-inner-glow',
                !reduce && 'group-hover:animate-glow-pulse',
              )}
            >
              {district.sign}
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/85 text-foreground shadow-inner-glow">
              <Icon className="h-5 w-5" />
            </span>
          </div>

          {/* Twinkling windows band */}
          <div className="grid grid-cols-6 gap-1.5 bg-white/40 px-4 py-3">
            {Array.from({ length: 12 }).map((_, i) => {
              const lit = (hash(`${district.name}-win-${i}`) & 3) !== 0;
              return (
                <span
                  key={i}
                  className={cn(
                    'h-2.5 rounded-[3px] transition-colors',
                    lit ? a.dot : 'bg-foreground/10',
                    lit && !reduce && 'group-hover:animate-glow-pulse',
                  )}
                  style={{ animationDelay: `${(i % 6) * 0.15}s` }}
                />
              );
            })}
          </div>

          {/* Body: name, tagline, live stat, enter affordance */}
          <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-base font-bold leading-tight text-foreground">
                {district.name}
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{district.tagline}</p>

            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
                  a.chip,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', a.dot, !reduce && 'animate-glow-pulse')} />
                <AnimatedNumber value={players} live suffix=" online" />
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-semibold opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100',
                  a.text,
                  '-translate-x-1',
                )}
              >
                Enter <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function WorldPage() {
  const prefersReduced = useReducedMotion();
  const reduce = prefersReduced ?? false;

  // Mouse parallax (normalized -0.5..0.5). Guarded by reduced-motion.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.4 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.4 });
  const sceneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduce) return;
    const el = sceneRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      rawX.set((e.clientX - rect.left) / rect.width - 0.5);
      rawY.set((e.clientY - rect.top) / rect.height - 0.5);
    };
    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [reduce, rawX, rawY]);

  const [activeLegend, setActiveLegend] = useState<string | null>(null);
  const totalOnline = DISTRICTS.reduce((sum, d) => sum + seededPlayers(d.name), 0);
  const daily = DISTRICTS[hash('daily-hotspot') % DISTRICTS.length]!;
  const weekly = DISTRICTS[hash('weekly-hotspot') % DISTRICTS.length]!;

  return (
    <div className="relative">
      {/* Scoped keyframes for ambient drifters (plain CSS — no styled-jsx dep). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes world-drift-r { from { transform: translateX(0); } to { transform: translateX(140vw); } }
@keyframes world-drift-l { from { transform: translateX(0); } to { transform: translateX(-140vw); } }
@media (prefers-reduced-motion: reduce) {
  [style*="world-drift"] { animation: none !important; }
}
`,
        }}
      />

      {/* ---- Header ------------------------------------------------------- */}
      <header className="relative z-10 mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="neon" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Interactive Hub
          </Badge>
          <Badge variant="live" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-glow-pulse" />
            <AnimatedNumber value={totalOnline} live suffix=" citizens online" />
          </Badge>
        </div>
        <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
          <span className="text-gradient">Gaming City</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Explore the districts of your futuristic playground. Every glowing building is a real
          destination — pick a district to dive in, or use the{' '}
          <Link href="/" className="font-semibold text-primary underline-offset-2 hover:underline">
            classic menu
          </Link>{' '}
          anytime.
        </p>
      </header>

      {/* ---- The City ----------------------------------------------------- */}
      <div
        ref={sceneRef}
        className="relative overflow-hidden rounded-3xl bg-grid p-4 sm:p-8"
        style={{
          backgroundImage:
            'radial-gradient(60rem 40rem at 20% -10%, hsl(263 90% 82% / 0.55), transparent 60%),' +
            'radial-gradient(50rem 40rem at 100% 0%, hsl(190 90% 80% / 0.5), transparent 58%),' +
            'radial-gradient(50rem 40rem at 50% 120%, hsl(326 90% 86% / 0.45), transparent 62%),' +
            'linear-gradient(180deg, hsl(210 100% 96%), hsl(263 60% 95%))',
        }}
      >
        <SkyLayer reduce={reduce} />

        {/* Skyline grid of buildings */}
        <div className="relative z-[5] grid grid-cols-2 gap-3 pb-28 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          {DISTRICTS.map((d, i) => (
            <DistrictBuilding
              key={d.name}
              district={d}
              index={i}
              mx={mx}
              my={my}
              reduce={reduce}
            />
          ))}
        </div>

        <GroundLayer reduce={reduce} />
      </div>

      {/* ---- District legend / minimap ------------------------------------ */}
      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-bold">District Directory</h2>
        </div>
        <div className="glass-strong flex flex-wrap gap-2 rounded-2xl p-3">
          {DISTRICTS.map((d) => {
            const a = ACCENT[d.accent];
            const Icon = d.icon;
            return (
              <Button
                key={d.name}
                asChild
                variant="glass"
                size="sm"
                className={cn(
                  'gap-2 transition-transform hover:-translate-y-0.5',
                  activeLegend === d.name && 'ring-2',
                  activeLegend === d.name && a.ring,
                )}
                onMouseEnter={() => setActiveLegend(d.name)}
                onMouseLeave={() => setActiveLegend(null)}
              >
                <Link href={d.href}>
                  <Icon className={cn('h-4 w-4', a.text)} />
                  {d.name}
                </Link>
              </Button>
            );
          })}
        </div>
      </section>

      {/* ---- Hotspots & Quick Travel -------------------------------------- */}
      <section className="mt-8 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <HotspotCard district={daily} label="Daily Hotspot" icon={Sparkles} />
          <HotspotCard district={weekly} label="Weekly Hotspot" icon={Trophy} />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Zap className="h-4 w-4 text-accent" />
          <h2 className="font-display text-lg font-bold">Quick Travel</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {DISTRICTS.map((d) => {
            const a = ACCENT[d.accent];
            const Icon = d.icon;
            return (
              <Link
                key={d.name}
                href={d.href}
                className="card-premium group flex items-center gap-3 p-3 transition-transform hover:-translate-y-1"
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-glow-sm', d.gradient)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold">{d.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span className="tabular-nums">{seededPlayers(d.name).toLocaleString('en-US')}</span>
                  </p>
                </div>
                <ArrowRight className={cn('h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1', a.text)} />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function HotspotCard({ district, label, icon: Icon }: { district: District; label: string; icon: LucideIcon }) {
  const DIcon = district.icon;
  return (
    <Link
      href={district.href}
      className="card-premium group relative flex items-center gap-4 overflow-hidden p-5 transition-transform hover:-translate-y-1"
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', district.gradient)} />
      <div className="bg-grid absolute inset-0 opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/40 to-transparent" />
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl glass-strong text-foreground shadow-glow animate-float">
        <DIcon className="h-7 w-7" />
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gold" className="shadow-glow-gold">
            <Icon className="mr-1 h-3 w-3" /> {label}
          </Badge>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald">
            <Users className="h-3.5 w-3.5" />
            <AnimatedNumber value={seededPlayers(district.name)} live />
          </span>
        </div>
        <h3 className="mt-1.5 font-display text-xl font-extrabold">{district.name}</h3>
        <p className="truncate text-sm text-muted-foreground">{district.tagline}</p>
      </div>
      <span className="relative hidden items-center gap-1 rounded-xl bg-gradient-to-r from-primary to-violet px-4 py-2 text-sm font-bold text-white shadow-glow-sm transition-transform group-hover:scale-105 sm:inline-flex">
        Travel <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
