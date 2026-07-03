'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Box,
  Check,
  CircleDollarSign,
  CircleDot,
  Clover,
  Coins,
  Compass,
  Cpu,
  Crown,
  Dice5,
  Diamond,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  Grid3x3,
  Image as ImageIcon,
  Lock,
  type LucideIcon,
  Medal,
  Moon,
  Music,
  Orbit,
  Package,
  Palette,
  Play,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Sunrise,
  Trees,
  Trophy,
  User,
  UserCircle2,
  Waves,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { CareerSummary } from '@/components/career/career-summary';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { PlayerTimeline } from '@/components/presence/player-timeline';
import { RecentMatches } from '@/components/presence/recent-match';
import { PlayerCard } from '@/components/profile/player-card';
import { recentMatches } from '@/lib/player-presence';
import {
  BANNERS,
  type Cosmetic,
  type CosmeticCategory,
  FRAMES,
  RARITY_TEXT,
  THEMES,
  TITLES,
} from '@/lib/cosmetics';
import { usePlayerProfile } from '@/stores/player-profile';

const ICONS: Record<string, LucideIcon> = {
  Play, Coins, Rocket, Sparkles, CircleDot, Trophy, Moon, Gem, Crown, Shield, Star, Award, Clover,
  Package, Box, Zap, Cpu, Diamond, Gamepad2, Waves, Trees, Orbit, User, Medal, Compass, ShieldCheck,
  Dice5, Image: ImageIcon, Grid3x3, Sunrise, Flame, Music, CircleDollarSign, Palette,
};

function cosmeticIcon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

const RARITY: Record<string, string> = {
  common: 'from-muted-foreground/40 to-muted-foreground/10 text-muted-foreground ring-black/10',
  rare: 'from-accent/40 to-accent/10 text-accent ring-accent/40',
  epic: 'from-violet/40 to-violet/10 text-violet ring-violet/40',
  legendary: 'from-gold/50 to-warning/10 text-gold ring-gold/50',
};

/* ---------------------------------------------------------- Customization */

const TABS: {
  id: CosmeticCategory;
  label: string;
  icon: LucideIcon;
  items: Cosmetic[];
  equippedKey: 'equippedFrame' | 'equippedTheme' | 'equippedTitle' | 'equippedBanner';
}[] = [
  { id: 'frame', label: 'Frames', icon: Shield, items: FRAMES, equippedKey: 'equippedFrame' },
  { id: 'theme', label: 'Themes', icon: Palette, items: THEMES, equippedKey: 'equippedTheme' },
  { id: 'title', label: 'Titles', icon: Award, items: TITLES, equippedKey: 'equippedTitle' },
  { id: 'banner', label: 'Banners', icon: ImageIcon, items: BANNERS, equippedKey: 'equippedBanner' },
];

function CustomizationSection() {
  const p = usePlayerProfile();
  const [active, setActive] = useState<CosmeticCategory>('frame');
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]!;
  const equippedId = p[tab.equippedKey];

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
        <Sparkles className="h-5 w-5 text-violet" /> Customization
        <span className="text-sm font-normal text-muted-foreground">
          equip what you own · buy the rest in the Store
        </span>
      </h2>

      {/* tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                'relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                isActive
                  ? 'text-white'
                  : 'border border-black/5 bg-white/60 text-muted-foreground hover:text-foreground',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="cust-tab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-violet to-pink shadow-glow"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <Icon className="h-4 w-4" /> {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* tiles */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {tab.items.map((item) => {
            const Icon = cosmeticIcon(item.icon);
            const owned = p.isOwned(item.id);
            const equipped = equippedId === item.id;
            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -3 }}
                className={cn(
                  'card-premium relative flex flex-col gap-3 overflow-hidden p-4',
                  equipped && 'ring-2 ring-primary shadow-glow',
                )}
              >
                {equipped && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-white shadow-glow">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
                <div
                  className={cn(
                    'relative flex h-16 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br',
                    item.gradient,
                  )}
                >
                  <Icon className="h-7 w-7 text-white drop-shadow" />
                  {!owned && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
                      <Lock className="h-5 w-5 text-white/90" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold">{item.name}</p>
                  <p className={cn('text-xs font-semibold capitalize', RARITY_TEXT[item.rarity])}>
                    {item.rarity}
                  </p>
                </div>
                {equipped ? (
                  <Badge variant="neon" className="w-full justify-center">
                    Equipped
                  </Badge>
                ) : owned ? (
                  <Button
                    size="sm"
                    variant="glass"
                    className="w-full"
                    onClick={() => {
                      p.equipCosmetic(tab.id, item.id);
                      toast.success(`${item.name} equipped`);
                    }}
                  >
                    Equip
                  </Button>
                ) : (
                  <Button size="sm" variant="gold" className="w-full sheen" asChild>
                    <Link href="/store">
                      <Coins className="mr-1 h-3.5 w-3.5" />
                      {item.price.toLocaleString()}
                    </Link>
                  </Button>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/* ------------------------------------------------------------ Status editor */

const STATUS_PRESETS = ['Online', 'Away', 'Busy', 'In a match', 'Chilling'];

function StatusEditor() {
  const status = usePlayerProfile((s) => s.status);
  const setStatus = usePlayerProfile((s) => s.setStatus);
  const [draft, setDraft] = useState(status);

  return (
    <section className="card-premium relative overflow-hidden p-6">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-primary text-white shadow-glow">
          <Sparkles className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">Status</h2>
          <p className="text-sm text-muted-foreground">Set a custom vibe for your card.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 40))}
          placeholder="What are you up to?"
          className="flex-1 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm outline-none backdrop-blur transition-colors focus:border-primary/60 focus:shadow-glow-sm"
        />
        <Button
          variant="gradient"
          onClick={() => {
            setStatus(draft);
            toast.success('Status updated');
          }}
        >
          Save status
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {STATUS_PRESETS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setDraft(s);
              setStatus(s);
            }}
            className="rounded-full border border-black/5 bg-white/60 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- Page */

export default function ProfilePage() {
  const p = usePlayerProfile();

  const claim = () => {
    const reward = p.claimDaily();
    if (reward > 0) toast.success(`Claimed ${reward.toLocaleString()} coins! 🎁`);
    else toast.info('Daily reward already claimed — come back tomorrow.');
  };

  return (
    <div className="space-y-8">
      {/* Player identity centerpiece */}
      <PlayerCard />

      {/* Career summary (links to the full /career dashboard) */}
      <CareerSummary />

      {/* Quick actions + coins */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant="gradient" className="sheen" asChild>
            <Link href="/avatar">
              <UserCircle2 className="mr-1 h-4 w-4" /> Edit Avatar
            </Link>
          </Button>
          <Button variant="gold" className="sheen" asChild>
            <Link href="/store">
              <Store className="mr-1 h-4 w-4" /> Cosmetic Store
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white/60 px-4 py-3 backdrop-blur">
          <Coins className="h-6 w-6 text-gold" />
          <div>
            <div className="font-display text-xl font-bold tabular-nums">
              <AnimatedNumber value={p.coins} />
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Demo coins
            </div>
          </div>
        </div>
      </div>

      {/* Status editor */}
      <StatusEditor />

      {/* Daily reward + season pass */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-premium sheen relative overflow-hidden p-6">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/20 blur-2xl" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-warning text-white shadow-glow-gold">
                <Gift className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Daily reward</h2>
                <p className="text-sm text-muted-foreground">
                  Day {p.dailyStreak} streak · +{(5000 + p.dailyStreak * 1000).toLocaleString()} coins
                </p>
              </div>
            </div>
            <Button variant="gold" onClick={claim} disabled={p.dailyClaimedToday} className="sheen">
              {p.dailyClaimedToday ? 'Claimed' : 'Claim'}
            </Button>
          </div>
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-bold',
                  i < p.dailyStreak ? 'bg-gradient-to-br from-gold to-warning text-white' : 'bg-black/5 text-muted-foreground',
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </section>

        <section className="card-premium relative overflow-hidden p-6">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-violet/20 blur-2xl" />
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet text-white shadow-glow">
              <Crown className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">Season Pass</h2>
              <p className="text-sm text-muted-foreground">{p.seasonName}</p>
            </div>
            <span className="ml-auto font-display text-2xl font-bold text-gradient">
              Tier {p.seasonTier}
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-pink" style={{ width: '68%' }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">68% to Tier {p.seasonTier + 1} · unlock the Golden Frame</p>
        </section>
      </div>

      {/* Recent activity timeline + recent matches */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-premium min-w-0 space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Zap className="h-5 w-5 text-violet" /> Recent Activity
          </h2>
          <PlayerTimeline seed={p.playerId} count={12} />
        </section>
        <section className="card-premium min-w-0 space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Gamepad2 className="h-5 w-5 text-accent" /> Recent Matches
          </h2>
          <RecentMatches matches={recentMatches(p.playerId, 6)} />
        </section>
      </div>

      {/* Customization */}
      <CustomizationSection />

      {/* Achievements */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
          <Trophy className="h-5 w-5 text-gold" /> Achievements
          <span className="text-sm font-normal text-muted-foreground">
            ({p.achievements.filter((a) => a.unlocked).length}/{p.achievements.length})
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {p.achievements.map((a, i) => {
            const Icon = ICONS[a.icon] ?? Trophy;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className={cn('card-premium p-4', !a.unlocked && 'opacity-60 saturate-50')}
              >
                <span
                  className={cn(
                    'mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1',
                    RARITY[a.rarity],
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <p className="font-display text-sm font-bold">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
                <Badge variant={a.unlocked ? 'success' : 'outline'} className="mt-2">
                  {a.unlocked ? 'Unlocked' : 'Locked'}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Inventory */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
          <Package className="h-5 w-5 text-violet" /> Inventory
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {p.inventory.map((item) => {
            const Icon = ICONS[item.icon] ?? Box;
            return (
              <div key={item.id} className="card-premium sheen flex items-center gap-3 p-4">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1',
                    RARITY[item.rarity],
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {item.rarity} {item.kind}
                  </p>
                </div>
                {item.kind === 'lootbox' ? (
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={() => toast.success('Opening… you got 2,500 coins + a rare badge! 🎉')}
                  >
                    Open
                  </Button>
                ) : item.equipped ? (
                  <Badge variant="neon">Equipped</Badge>
                ) : (
                  <Button size="sm" variant="glass" onClick={() => usePlayerProfile.getState().equip(item.id)}>
                    Equip
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
