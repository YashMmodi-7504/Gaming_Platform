'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CircleDollarSign,
  CircleDot,
  Clover,
  Coins,
  Compass,
  Cpu,
  Crown,
  Diamond,
  Dice5,
  Flame,
  Gamepad2,
  Gem,
  Grid3x3,
  Image as ImageIcon,
  Lock,
  type LucideIcon,
  Medal,
  MousePointer2,
  Music,
  Orbit,
  Package,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Shield,
  ShoppingBag,
  Sparkles,
  Spade,
  Star,
  Sunrise,
  Trees,
  Trophy,
  User,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import {
  ALL_COSMETICS,
  type Cosmetic,
  type CosmeticCategory,
  RARITY_RING,
  RARITY_TEXT,
} from '@/lib/cosmetics';
import { sound } from '@/lib/sound';
import { useDemoWallet } from '@/stores/demo-wallet';
import { usePlayerProfile } from '@/stores/player-profile';

/* ---- Icon record (lucide-by-name with fallback) -------------------------- */
const ICONS: Record<string, LucideIcon> = {
  Shield, Gem, Crown, Sparkles, Zap, Cpu, Diamond, Trophy, Gamepad2, Rocket, Star,
  Waves, Trees, Orbit, User, Clover, Dice5, CircleDot, Medal, Package, Compass,
  ShieldCheck, Image: ImageIcon, Grid3x3, Sunrise, Flame, Coins, MousePointer2,
  Music, CircleDollarSign, Spade,
};
const iconFor = (name: string): LucideIcon => ICONS[name] ?? Sparkles;

/* ---- Category tabs -> CosmeticCategory ----------------------------------- */
interface Tab {
  key: string;
  label: string;
  cat: CosmeticCategory | null; // null = All
}
const TABS: Tab[] = [
  { key: 'all', label: 'All', cat: null },
  { key: 'frame', label: 'Frames', cat: 'frame' },
  { key: 'theme', label: 'Themes', cat: 'theme' },
  { key: 'title', label: 'Titles', cat: 'title' },
  { key: 'banner', label: 'Banners', cat: 'banner' },
  { key: 'particle', label: 'Particles', cat: 'particle' },
  { key: 'cursor', label: 'Cursors', cat: 'cursor' },
  { key: 'music', label: 'Music', cat: 'music' },
  { key: 'diceSkin', label: 'Dice Skins', cat: 'diceSkin' },
  { key: 'chip', label: 'Chips', cat: 'chip' },
  { key: 'cardBack', label: 'Card Backs', cat: 'cardBack' },
];

const EQUIPPABLE: CosmeticCategory[] = ['frame', 'theme', 'title', 'banner'];
const isEquippable = (c: CosmeticCategory) => EQUIPPABLE.includes(c);

/* ---- Lightweight confetti burst ------------------------------------------ */
function Confetti({ show }: { show: boolean }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        x: (i / 18) * 100,
        delay: (i % 6) * 0.03,
        hue: ['bg-gold', 'bg-pink', 'bg-violet', 'bg-accent', 'bg-primary'][i % 5],
      })),
    [],
  );
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {bits.map((b) => (
        <motion.span
          key={b.id}
          initial={{ opacity: 1, y: -8, x: `${b.x}%`, scale: 1 }}
          animate={{ opacity: 0, y: 220, rotate: 360 }}
          transition={{ duration: 1, delay: b.delay, ease: 'easeOut' }}
          className={cn('absolute top-0 h-2 w-2 rounded-sm', b.hue)}
        />
      ))}
    </div>
  );
}

export default function StorePage() {
  const balance = useDemoWallet((s) => s.balance);
  const reload = useDemoWallet((s) => s.reload);
  const owned = usePlayerProfile((s) => s.owned);
  const equippedFrame = usePlayerProfile((s) => s.equippedFrame);
  const equippedTheme = usePlayerProfile((s) => s.equippedTheme);
  const equippedTitle = usePlayerProfile((s) => s.equippedTitle);
  const equippedBanner = usePlayerProfile((s) => s.equippedBanner);
  const buy = usePlayerProfile((s) => s.buy);
  const equipCosmetic = usePlayerProfile((s) => s.equipCosmetic);

  const [tab, setTab] = useState<string>('all');
  const [preview, setPreview] = useState<Cosmetic | null>(null);
  const [confettiId, setConfettiId] = useState<string | null>(null);

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0]!;
  const items = useMemo(
    () => (activeTab.cat ? ALL_COSMETICS.filter((c) => c.category === activeTab.cat) : ALL_COSMETICS),
    [activeTab],
  );

  const equippedId = (cat: CosmeticCategory): string | null => {
    switch (cat) {
      case 'frame':
        return equippedFrame;
      case 'theme':
        return equippedTheme;
      case 'title':
        return equippedTitle;
      case 'banner':
        return equippedBanner;
      default:
        return null;
    }
  };

  const handleBuy = (item: Cosmetic) => {
    const ok = buy(item.id);
    if (ok) {
      sound.play('coin');
      setConfettiId(item.id);
      window.setTimeout(() => setConfettiId((c) => (c === item.id ? null : c)), 1100);
      toast.success(`Purchased ${item.name}!`, {
        description: `${item.price.toLocaleString()} coins spent.`,
      });
    } else {
      toast.error('Not enough coins.', { description: 'Reload your demo balance and try again.' });
    }
  };

  const handleEquip = (item: Cosmetic) => {
    equipCosmetic(item.category, item.id);
    sound.play('reward');
    toast.success(`Equipped ${item.name}.`);
  };

  const handleReload = () => {
    reload();
    sound.play('coin');
    toast.success('Demo coins reloaded to 100,000!');
  };

  return (
    <div className="relative space-y-6">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.04]" />

      {/* Header */}
      <section className="card-premium sheen relative overflow-hidden p-6 sm:p-7">
        <div className="bg-aurora absolute inset-0 opacity-10" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet to-pink text-white shadow-glow">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-gradient sm:text-3xl">Cosmetic Store</h1>
              <p className="text-sm text-muted-foreground">
                Buy, preview and equip cosmetics with demo coins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-gold/20 bg-white/70 px-4 py-2.5 shadow-glow-gold backdrop-blur">
              <Coins className="h-6 w-6 text-gold" />
              <div>
                <div className="font-display text-xl font-bold text-gradient-gold">
                  <AnimatedNumber value={balance} />
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Demo coins</div>
              </div>
            </div>
            <Button variant="gold" size="sm" onClick={handleReload} className="sheen">
              <RefreshCw className="mr-1.5 h-4 w-4" /> Reload
            </Button>
          </div>
        </div>
        <p className="relative mt-3 text-xs text-muted-foreground">
          Running low? Hit <span className="font-semibold text-gold">Reload</span> for a fresh 100,000 demo coins — anytime.
        </p>
      </section>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition-all',
                active
                  ? 'bg-gradient-to-r from-primary via-violet to-pink text-white shadow-glow'
                  : 'glass text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item, i) => {
          const Icon = iconFor(item.icon);
          const ownedIt = owned.includes(item.id);
          const affordable = balance >= item.price;
          const equipped = equippedId(item.category) === item.id;
          const equippable = isEquippable(item.category);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.4) }}
              className="card-premium group relative flex flex-col overflow-hidden p-3"
            >
              <Confetti show={confettiId === item.id} />

              {/* Preview swatch */}
              <button
                onClick={() => setPreview(item)}
                className={cn(
                  'relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ring-2 transition-transform group-hover:scale-[1.02]',
                  item.gradient,
                  RARITY_RING[item.rarity],
                )}
              >
                <div className="bg-grid absolute inset-0 opacity-10" />
                <Icon className="relative h-11 w-11 text-white drop-shadow-lg" />
                {ownedIt ? (
                  <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald text-white shadow-glow-sm">
                    <Check className="h-4 w-4" />
                  </span>
                ) : null}
              </button>

              {/* Meta */}
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold">{item.name}</p>
                  <p className={cn('text-[11px] font-semibold capitalize', RARITY_TEXT[item.rarity])}>
                    {item.rarity}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-sm font-bold text-gold">
                  <Coins className="h-3.5 w-3.5" />
                  {item.price === 0 ? 'Free' : item.price.toLocaleString()}
                </div>
              </div>

              {/* Action */}
              <div className="mt-3">
                {ownedIt ? (
                  equippable ? (
                    equipped ? (
                      <Button size="sm" variant="glass" disabled className="w-full">
                        <Check className="mr-1.5 h-4 w-4 text-emerald" /> Equipped
                      </Button>
                    ) : (
                      <Button size="sm" variant="neon" className="w-full" onClick={() => handleEquip(item)}>
                        Equip
                      </Button>
                    )
                  ) : (
                    <div className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald/10 py-1.5 text-sm font-semibold text-emerald ring-1 ring-inset ring-emerald/40">
                      <Check className="h-4 w-4" /> Owned
                    </div>
                  )
                ) : affordable ? (
                  <Button size="sm" variant="gradient" className="w-full" onClick={() => handleBuy(item)}>
                    Buy
                  </Button>
                ) : (
                  <Button size="sm" variant="glass" disabled className="w-full">
                    <Lock className="mr-1.5 h-3.5 w-3.5" /> Not enough coins
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {preview ? (
          <PreviewModal
            item={preview}
            owned={owned.includes(preview.id)}
            equipped={equippedId(preview.category) === preview.id}
            equippable={isEquippable(preview.category)}
            affordable={balance >= preview.price}
            onClose={() => setPreview(null)}
            onBuy={() => handleBuy(preview)}
            onEquip={() => handleEquip(preview)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---- Preview modal ------------------------------------------------------- */
function PreviewModal({
  item,
  owned,
  equipped,
  equippable,
  affordable,
  onClose,
  onBuy,
  onEquip,
}: {
  item: Cosmetic;
  owned: boolean;
  equipped: boolean;
  equippable: boolean;
  affordable: boolean;
  onClose: () => void;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const Icon = iconFor(item.icon);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="card-premium relative w-full max-w-md overflow-hidden p-5"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full glass text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={cn(
            'relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ring-2',
            item.gradient,
            RARITY_RING[item.rarity],
          )}
        >
          <div className="bg-grid absolute inset-0 opacity-10" />
          <Icon className="relative h-20 w-20 text-white drop-shadow-xl" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">{item.name}</h2>
          <Badge variant={item.rarity === 'legendary' ? 'gold' : item.rarity === 'epic' ? 'featured' : item.rarity === 'rare' ? 'neon' : 'outline'}>
            <span className="capitalize">{item.rarity}</span>
          </Badge>
        </div>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{item.category} cosmetic</p>

        <div className="mt-3 flex items-center gap-2 text-lg font-bold text-gold">
          <Coins className="h-5 w-5" />
          {item.price === 0 ? 'Free' : item.price.toLocaleString()}
        </div>

        <div className="mt-5">
          {owned ? (
            equippable ? (
              equipped ? (
                <Button variant="glass" disabled className="w-full">
                  <Check className="mr-1.5 h-4 w-4 text-emerald" /> Equipped
                </Button>
              ) : (
                <Button variant="neon" className="w-full" onClick={onEquip}>
                  Equip now
                </Button>
              )
            ) : (
              <div className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald/10 py-2.5 text-sm font-semibold text-emerald ring-1 ring-inset ring-emerald/40">
                <Check className="h-4 w-4" /> Owned
              </div>
            )
          ) : affordable ? (
            <Button variant="gradient" className="w-full sheen" onClick={onBuy}>
              Buy for {item.price.toLocaleString()} coins
            </Button>
          ) : (
            <Button variant="glass" disabled className="w-full">
              <Lock className="mr-1.5 h-4 w-4" /> Not enough coins
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
