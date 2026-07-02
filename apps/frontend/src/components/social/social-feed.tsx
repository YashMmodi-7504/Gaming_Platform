'use client';

import { Badge, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import {
  Award,
  CircleDot,
  Coins,
  Gem,
  Heart,
  MessageCircle,
  Rocket,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import {
  avatarGradient,
  friends,
  initials,
  recentAchievements,
} from '@/lib/ecosystem-data';

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

const ICONS: Record<string, LucideIcon> = {
  Trophy,
  Sparkles,
  Rocket,
  CircleDot,
  Coins,
  Gem,
  Award,
  Zap,
  Users,
  TrendingUp,
  Star,
};
function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

/* -------------------------------------------------------------------------- */
/* Feed item model                                                            */
/* -------------------------------------------------------------------------- */

type FeedType = 'achievement' | 'levelup' | 'tournament' | 'milestone' | 'event';

interface FeedItem {
  id: string;
  type: FeedType;
  name: string; // subject (person / community)
  seed: string; // avatar seed
  flag?: string;
  icon: string; // lucide name
  text: React.ReactNode;
  time: string;
  likes: number;
}

const TYPE_STYLE: Record<FeedType, { chip: string; label: string; badge: 'neon' | 'featured' | 'gold' | 'success' | 'default' }> = {
  achievement: { chip: 'bg-violet/15 text-violet', label: 'Achievement', badge: 'featured' },
  levelup: { chip: 'bg-primary/15 text-primary', label: 'Level Up', badge: 'neon' },
  tournament: { chip: 'bg-gradient-gold text-gold-foreground', label: 'Tournament', badge: 'gold' },
  milestone: { chip: 'bg-emerald/15 text-emerald', label: 'Milestone', badge: 'success' },
  event: { chip: 'bg-pink/15 text-pink', label: 'Event', badge: 'default' },
};

/* -------------------------------------------------------------------------- */
/* Deterministic feed (module scope — never empty)                            */
/* -------------------------------------------------------------------------- */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildFeed(): FeedItem[] {
  const ach = recentAchievements();
  const fr = friends();
  const items: FeedItem[] = [];

  // Community + event anchors (always present).
  items.push({
    id: 'milestone-rounds',
    type: 'milestone',
    name: 'Community',
    seed: 'community',
    icon: 'TrendingUp',
    text: (
      <>
        <span className="font-semibold text-foreground">Community milestone</span> — over{' '}
        <span className="font-semibold text-emerald">1,000,000 rounds</span> played today!
      </>
    ),
    time: '2m ago',
    likes: 3428,
  });
  items.push({
    id: 'event-doublexp',
    type: 'event',
    name: 'Double XP Weekend',
    seed: 'event-doublexp',
    icon: 'Zap',
    text: (
      <>
        <span className="font-semibold text-foreground">Event reminder</span> — Double XP Weekend is
        live. Earn <span className="font-semibold text-pink">2× battle-pass XP</span> on every game.
      </>
    ),
    time: '11m ago',
    likes: 892,
  });

  // Achievement unlocks (mix in recentAchievements).
  ach.forEach((a, i) => {
    items.push({
      id: `ach-${a.seed}`,
      type: 'achievement',
      name: a.player,
      seed: a.seed,
      flag: a.flag,
      icon: a.icon,
      text: (
        <>
          <span className="font-semibold text-foreground">{a.player}</span> unlocked{' '}
          <span className="font-semibold text-violet">{a.title}</span>{' '}
          <span className="text-muted-foreground">({a.rarity})</span>
        </>
      ),
      time: `${8 + i * 3}m ago`,
      likes: 40 + (hash(a.seed) % 460),
    });
  });

  // Level-ups + tournament wins from friends.
  fr.slice(0, 7).forEach((f, i) => {
    const h = hash(f.seed);
    const isTourney = i % 3 === 2;
    if (isTourney) {
      items.push({
        id: `tourney-${f.seed}`,
        type: 'tournament',
        name: f.name,
        seed: f.seed,
        flag: f.flag,
        icon: 'Trophy',
        text: (
          <>
            <span className="font-semibold text-foreground">{f.name}</span> won a tournament and
            banked <span className="font-semibold text-gold">${(5000 + (h % 45000)).toLocaleString()}</span>!
          </>
        ),
        time: `${20 + i * 7}m ago`,
        likes: 120 + (h % 380),
      });
    } else {
      const newLevel = f.level + 1;
      items.push({
        id: `level-${f.seed}`,
        type: 'levelup',
        name: f.name,
        seed: f.seed,
        flag: f.flag,
        icon: 'Star',
        text: (
          <>
            <span className="font-semibold text-foreground">{f.name}</span> leveled up to{' '}
            <span className="font-semibold text-primary">Level {newLevel}</span>
          </>
        ),
        time: `${15 + i * 6}m ago`,
        likes: 20 + (h % 240),
      });
    }
  });

  return items;
}

// Built once at module scope — deterministic, never empty.
const FEED = buildFeed();

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function SocialFeed({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {FEED.map((item, i) => (
        <FeedRow key={item.id} item={item} index={i} />
      ))}
    </div>
  );
}

function FeedRow({ item, index }: { item: FeedItem; index: number }) {
  const [likes, setLikes] = useState(item.likes);
  const [liked, setLiked] = useState(false);
  const Icon = iconFor(item.icon);
  const style = TYPE_STYLE[item.type];

  function toggleLike() {
    setLiked((prev) => {
      setLikes((n) => n + (prev ? -1 : 1));
      return !prev;
    });
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4) }}
      className="card-premium flex gap-4 p-5"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <span
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white',
            avatarGradient(item.seed),
          )}
        >
          {initials(item.name)}
        </span>
        <span className={cn('absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-card', style.chip)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {item.flag ? <span className="text-base leading-none">{item.flag}</span> : null}
            {item.name}
          </span>
          <Badge variant={style.badge}>{style.label}</Badge>
          <span className="text-xs text-muted-foreground">· {item.time}</span>
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>

        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              liked ? 'bg-pink/15 text-pink' : 'text-muted-foreground hover:bg-black/5 hover:text-pink',
            )}
          >
            <Heart className={cn('h-3.5 w-3.5 transition-transform', liked && 'scale-110 fill-current')} />
            <span className="font-mono tabular-nums">{likes.toLocaleString()}</span>
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" /> Reply
          </span>
        </div>
      </div>
    </motion.article>
  );
}
