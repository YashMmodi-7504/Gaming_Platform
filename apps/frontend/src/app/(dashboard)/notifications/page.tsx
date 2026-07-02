'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CalendarClock,
  CheckCheck,
  Coins,
  Gift,
  Inbox,
  type LucideIcon,
  MessageCircle,
  PartyPopper,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Wrench,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

/* ---- Types & deterministic data ----------------------------------------- */

type Category = 'Rewards' | 'Tournaments' | 'Social' | 'Wins' | 'System';

interface Notification {
  id: string;
  category: Category;
  icon: LucideIcon;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  href: string;
}

/**
 * Deterministic, presentation-only mock notifications. Defined at module
 * scope — no Date.now()/Math.random(), so the list is stable across renders
 * and never empty.
 */
const NOTIFICATIONS: Notification[] = [
  // Rewards
  { id: 'rw-1', category: 'Rewards', icon: Gift, title: 'Welcome bonus ready', desc: 'Claim 100% up to $500 on your next deposit.', time: 'now', unread: true, href: '/rewards' },
  { id: 'rw-2', category: 'Rewards', icon: Coins, title: 'Daily reward unlocked', desc: 'Your Day 4 streak reward is waiting.', time: '38m', unread: true, href: '/daily' },
  { id: 'rw-3', category: 'Rewards', icon: Sparkles, title: 'Battle Pass tier up', desc: 'You reached Tier 37 — a Mystery Box dropped.', time: '3h', unread: false, href: '/rewards' },

  // Tournaments
  { id: 'tn-1', category: 'Tournaments', icon: Trophy, title: 'Weekend Showdown starts soon', desc: 'Kicks off in 2h — a $1,000,000 pool awaits.', time: '12m', unread: true, href: '/tournaments' },
  { id: 'tn-2', category: 'Tournaments', icon: CalendarClock, title: 'Registration closing', desc: 'Crash Masters entry closes in 45 minutes.', time: '1h', unread: true, href: '/tournaments' },
  { id: 'tn-3', category: 'Tournaments', icon: Rocket, title: 'You climbed to #6', desc: 'Nice run — 3 spots to reach the prize zone.', time: '4h', unread: false, href: '/leaderboards' },

  // Social
  { id: 'so-1', category: 'Social', icon: UserPlus, title: 'NovaStrike sent a friend request', desc: 'Tap to accept and squad up.', time: '9m', unread: true, href: '/friends' },
  { id: 'so-2', category: 'Social', icon: MessageCircle, title: 'CryptoFox invited you', desc: 'Join their Roulette Night table.', time: '54m', unread: true, href: '/friends' },
  { id: 'so-3', category: 'Social', icon: PartyPopper, title: 'LunaBet is now online', desc: 'Your friend just hopped into the lobby.', time: '2h', unread: false, href: '/friends' },

  // Wins
  { id: 'wn-1', category: 'Wins', icon: Zap, title: 'Crash hit 25.3×', desc: 'A player just cashed out big on Crash.', time: '24m', unread: true, href: '/arcade' },
  { id: 'wn-2', category: 'Wins', icon: Trophy, title: 'Jackpot won on Dice', desc: 'PixelKing landed a $42,180 triple.', time: '1h', unread: false, href: '/arcade' },
  { id: 'wn-3', category: 'Wins', icon: Coins, title: 'Your best win this week', desc: 'You cashed out $3,240 on Roulette.', time: '1d', unread: false, href: '/transactions' },

  // System
  { id: 'sy-1', category: 'System', icon: ShieldCheck, title: 'New login detected', desc: 'A sign-in from a new device was verified.', time: '5h', unread: true, href: '/settings/security' },
  { id: 'sy-2', category: 'System', icon: Wrench, title: 'Scheduled maintenance', desc: 'Brief downtime planned Sunday 03:00 UTC.', time: '1d', unread: false, href: '/settings' },
  { id: 'sy-3', category: 'System', icon: Sparkles, title: 'New games added', desc: '8 fresh titles landed in the arcade.', time: '2d', unread: false, href: '/games?sort=newest' },
  { id: 'sy-4', category: 'System', icon: ShieldCheck, title: 'Verification approved', desc: 'Your account limits have been increased.', time: '3d', unread: false, href: '/settings' },
];

const CATEGORIES: Category[] = ['Rewards', 'Tournaments', 'Social', 'Wins', 'System'];

/** Per-category visual identity (icon chip gradient + accent text/dot). */
const CATEGORY_STYLE: Record<
  Category,
  { chip: string; text: string; dot: string; badge: 'neon' | 'gold' | 'success' | 'new' | 'featured' }
> = {
  Rewards: { chip: 'from-gold to-warning', text: 'text-gold', dot: 'bg-gold', badge: 'gold' },
  Tournaments: { chip: 'from-primary to-violet', text: 'text-primary', dot: 'bg-primary', badge: 'featured' },
  Social: { chip: 'from-pink to-violet', text: 'text-pink', dot: 'bg-pink', badge: 'neon' },
  Wins: { chip: 'from-emerald to-accent', text: 'text-emerald', dot: 'bg-emerald', badge: 'success' },
  System: { chip: 'from-accent to-primary', text: 'text-accent', dot: 'bg-accent', badge: 'new' },
};

type Filter = 'All' | 'Unread' | Category;

/* ---- Presentational row ------------------------------------------------- */

function NotificationRow({
  note,
  onRead,
}: {
  note: Notification;
  onRead: (id: string) => void;
}) {
  const Icon = note.icon;
  const style = CATEGORY_STYLE[note.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22 }}
    >
      <Link
        href={note.href}
        onClick={() => onRead(note.id)}
        className={cn(
          'group flex items-start gap-3 rounded-xl border p-3.5 transition-all hover:-translate-y-0.5',
          note.unread
            ? 'glass border-black/10 shadow-glow-sm hover:shadow-glow'
            : 'border-black/[0.06] bg-white/[0.02] hover:bg-black/5',
        )}
      >
        <span
          className={cn(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-glow-sm',
            style.chip,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn('truncate text-sm font-semibold', note.unread && 'text-foreground')}>
              {note.title}
            </p>
            {note.unread ? (
              <span className={cn('h-2 w-2 shrink-0 rounded-full', style.dot)} aria-label="unread" />
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{note.desc}</p>
          <span className={cn('mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide', style.text)}>
            {note.category}
          </span>
        </div>

        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {note.time}
        </span>
      </Link>
    </motion.div>
  );
}

/* ---- Page --------------------------------------------------------------- */

export default function NotificationsPage() {
  // Local read-state overlay on top of the deterministic seed data.
  const [readIds, setReadIds] = useState<Record<string, true>>({});
  const [filter, setFilter] = useState<Filter>('All');

  const items = useMemo(
    () => NOTIFICATIONS.map((n) => ({ ...n, unread: n.unread && !readIds[n.id] })),
    [readIds],
  );

  const unreadCount = items.filter((n) => n.unread).length;

  const markRead = (id: string) => setReadIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  const markAllRead = () => {
    const all: Record<string, true> = {};
    for (const n of NOTIFICATIONS) all[n.id] = true;
    setReadIds(all);
  };

  const filtered = useMemo(() => {
    if (filter === 'All') return items;
    if (filter === 'Unread') return items.filter((n) => n.unread);
    return items.filter((n) => n.category === filter);
  }, [items, filter]);

  // Split into active (unread, or everything under a category/All view) and history (read).
  const showHistorySplit = filter === 'All' || filter === 'Unread';
  const active = showHistorySplit ? filtered.filter((n) => n.unread) : filtered.filter((n) => n.unread);
  const history = showHistorySplit
    ? filtered.filter((n) => !n.unread)
    : filtered.filter((n) => !n.unread);

  const tabs: Filter[] = ['All', 'Unread', ...CATEGORIES];

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35]" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet text-white shadow-glow">
            <Bell className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold text-gradient">Notifications</h1>
              {unreadCount > 0 ? (
                <Badge variant="neon" className="font-mono tabular-nums">
                  {unreadCount} new
                </Badge>
              ) : (
                <Badge variant="success">All read</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Rewards, tournaments, social and system updates.</p>
          </div>
        </div>

        <Button variant="glass" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCheck className="mr-1.5 h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const count =
            tab === 'All'
              ? items.length
              : tab === 'Unread'
                ? unreadCount
                : items.filter((n) => n.category === tab).length;
          const activeTab = filter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                'sheen inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
                activeTab
                  ? 'border-transparent bg-gradient-to-r from-primary to-violet text-white shadow-glow-sm'
                  : 'border-black/10 bg-white/[0.03] text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {tab}
              <span
                className={cn(
                  'font-mono text-[10px] tabular-nums',
                  activeTab ? 'text-white/80' : 'text-muted-foreground/70',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active list */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {filter === 'Unread' || filter === 'All' ? 'New' : filter}
          </h2>
        </div>

        {active.length > 0 ? (
          <motion.div layout className="space-y-2.5">
            <AnimatePresence initial={false}>
              {active.map((note) => (
                <NotificationRow key={note.id} note={note} onRead={markRead} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-premium sheen flex flex-col items-center justify-center gap-2 p-10 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald to-accent text-white shadow-glow">
              <Inbox className="h-7 w-7" />
            </span>
            <p className="font-display text-lg font-bold text-gradient">You&apos;re all caught up</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              No new notifications here. Check History below for the older ones.
            </p>
          </motion.div>
        )}
      </section>

      {/* History (older / read) */}
      {history.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              History
            </h2>
          </div>
          <motion.div layout className="space-y-2.5 opacity-90">
            <AnimatePresence initial={false}>
              {history.map((note) => (
                <NotificationRow key={note.id} note={note} onRead={markRead} />
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      ) : null}
    </div>
  );
}
