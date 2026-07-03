'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  ArchiveRestore,
  Bell,
  Coins,
  Gift,
  Info,
  Mail,
  MailOpen,
  Package,
  Sparkles,
  Trophy,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { PageHeader } from '@/components/shared/page-header';
import { sound } from '@/lib/sound';
import { useDemoWallet } from '@/stores/demo-wallet';

/* ---- Types --------------------------------------------------------------- */
type MailType = 'Reward' | 'Tournament' | 'Gift' | 'System' | 'Friend';

interface Mail {
  id: string;
  type: MailType;
  icon: string;
  from: string;
  subject: string;
  body: string;
  reward?: { coins?: number; item?: string };
  time: string;
  unread: boolean;
  claimed: boolean;
  archived: boolean;
}

const TYPE_META: Record<MailType, { icon: LucideIcon; grad: string; text: string; badge: 'gold' | 'featured' | 'neon' | 'new' | 'outline' }> = {
  Reward: { icon: Coins, grad: 'from-gold to-warning', text: 'text-gold', badge: 'gold' },
  Tournament: { icon: Trophy, grad: 'from-primary to-violet', text: 'text-primary', badge: 'featured' },
  Gift: { icon: Gift, grad: 'from-pink to-violet', text: 'text-pink', badge: 'new' },
  System: { icon: Info, grad: 'from-accent to-primary', text: 'text-accent', badge: 'neon' },
  Friend: { icon: UserPlus, grad: 'from-emerald to-accent', text: 'text-emerald', badge: 'outline' },
};

const ICONS: Record<string, LucideIcon> = {
  Coins,
  Trophy,
  Gift,
  Info,
  UserPlus,
  Package,
  Sparkles,
  Bell,
};
function MailIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Mail;
  return <Cmp className={className} />;
}

/* ---- Deterministic mock mail (module scope, never empty) ----------------- */
const INITIAL_MAIL: Mail[] = [
  {
    id: 'm1',
    type: 'Reward',
    icon: 'Coins',
    from: 'Daily Rewards',
    subject: 'Your daily login bonus is here!',
    body: 'Thanks for coming back! Your login streak is heating up. Claim your daily coin bonus and keep the streak alive for even bigger rewards tomorrow.',
    reward: { coins: 5000 },
    time: '2m ago',
    unread: true,
    claimed: false,
    archived: false,
  },
  {
    id: 'm2',
    type: 'Tournament',
    icon: 'Trophy',
    from: 'Weekend Showdown',
    subject: 'You placed 3rd — prize enclosed',
    body: 'Incredible run in the Weekend Showdown! You finished 3rd out of 4,200 players. Your podium payout and a Bronze Cup trophy have been added to your account.',
    reward: { coins: 25000, item: 'Bronze Cup' },
    time: '1h ago',
    unread: true,
    claimed: false,
    archived: false,
  },
  {
    id: 'm3',
    type: 'Gift',
    icon: 'Gift',
    from: 'NovaStrike',
    subject: 'A gift for my favorite clanmate 🎁',
    body: 'Hey! Thanks for carrying us through the clan war last night. Here is a little something — a Mystery Box and some coins. See you in the arena!',
    reward: { coins: 3000, item: 'Mystery Box' },
    time: '3h ago',
    unread: true,
    claimed: false,
    archived: false,
  },
  {
    id: 'm4',
    type: 'System',
    icon: 'Info',
    from: 'Neon Rush Team',
    subject: 'Season 3 · Neon Rush is live',
    body: 'A brand new season has arrived! Explore fresh battle-pass rewards, limited-time cosmetics, and a revamped Crash mode. Your season progress has been reset — climb the tiers to claim exclusive gear.',
    time: '1d ago',
    unread: false,
    claimed: false,
    archived: false,
  },
  {
    id: 'm5',
    type: 'Friend',
    icon: 'UserPlus',
    from: 'CryptoFox',
    subject: 'Friend request accepted',
    body: 'CryptoFox accepted your friend request. You can now invite each other to private tables and compare stats on the Hall of Fame.',
    time: '1d ago',
    unread: false,
    claimed: false,
    archived: false,
  },
  {
    id: 'm6',
    type: 'Reward',
    icon: 'Sparkles',
    from: 'Battle Pass',
    subject: 'Tier 37 reward unlocked',
    body: 'You reached Tier 37 in the Neon Rush battle pass! A Neon Avatar Frame and a stack of coins are waiting for you. Keep grinding to hit the legendary Season Crown at Tier 50.',
    reward: { coins: 8000, item: 'Neon Avatar Frame' },
    time: '2d ago',
    unread: false,
    claimed: false,
    archived: false,
  },
  {
    id: 'm7',
    type: 'Tournament',
    icon: 'Trophy',
    from: 'Crash Masters',
    subject: 'Invitation: Crash Masters Invitational',
    body: 'You have been invited to the Crash Masters Invitational based on your recent performance. Entry is free for qualified players. Register before the bracket locks!',
    time: '3d ago',
    unread: false,
    claimed: false,
    archived: false,
  },
  {
    id: 'm8',
    type: 'Gift',
    icon: 'Package',
    from: 'Support Team',
    subject: 'A little something for your patience',
    body: 'Thanks for your patience during last week’s maintenance. Please accept this Elite Crate and a coin bonus as our way of saying thank you.',
    reward: { coins: 10000, item: 'Elite Crate' },
    time: '4d ago',
    unread: false,
    claimed: false,
    archived: false,
  },
  {
    id: 'm9',
    type: 'System',
    icon: 'Bell',
    from: 'Security',
    subject: 'New device sign-in',
    body: 'We noticed a sign-in from a new device. If this was you, no action is needed. If not, please secure your account from Settings → Security.',
    time: '5d ago',
    unread: false,
    claimed: false,
    archived: false,
  },
];

const TABS: ('All' | MailType)[] = ['All', 'Reward', 'Tournament', 'Gift', 'System', 'Friend'];

export default function MailboxPage() {
  const [mail, setMail] = useState<Mail[]>(INITIAL_MAIL);
  const [tab, setTab] = useState<'All' | MailType>('All');
  const [openId, setOpenId] = useState<string>(INITIAL_MAIL[0]?.id ?? '');
  const [showArchive, setShowArchive] = useState(false);

  const inbox = useMemo(() => mail.filter((m) => !m.archived), [mail]);
  const archived = useMemo(() => mail.filter((m) => m.archived), [mail]);
  const unreadCount = useMemo(() => inbox.filter((m) => m.unread).length, [inbox]);
  const unclaimedCount = useMemo(() => inbox.filter((m) => m.reward && !m.claimed).length, [inbox]);

  const filtered = useMemo(
    () => (tab === 'All' ? inbox : inbox.filter((m) => m.type === tab)),
    [inbox, tab],
  );
  const open = useMemo(() => mail.find((m) => m.id === openId) ?? null, [mail, openId]);

  function selectMail(m: Mail) {
    setOpenId(m.id);
    if (m.unread) setMail((prev) => prev.map((x) => (x.id === m.id ? { ...x, unread: false } : x)));
  }

  function claim(m: Mail) {
    if (!m.reward || m.claimed) return;
    const coins = m.reward.coins ?? 0;
    if (coins > 0) useDemoWallet.getState().credit(coins);
    setMail((prev) => prev.map((x) => (x.id === m.id ? { ...x, claimed: true, unread: false } : x)));
    sound.play('reward');
    toast.success('Reward claimed!', {
      description: [coins > 0 ? `+${coins.toLocaleString('en-US')} coins` : null, m.reward.item].filter(Boolean).join(' · '),
    });
  }

  function claimAll() {
    const claimable = inbox.filter((m) => m.reward && !m.claimed);
    if (claimable.length === 0) {
      toast('Nothing to claim', { description: 'You are all caught up.' });
      return;
    }
    const totalCoins = claimable.reduce((sum, m) => sum + (m.reward?.coins ?? 0), 0);
    if (totalCoins > 0) useDemoWallet.getState().credit(totalCoins);
    const ids = new Set(claimable.map((m) => m.id));
    setMail((prev) => prev.map((x) => (ids.has(x.id) ? { ...x, claimed: true, unread: false } : x)));
    sound.play('reward');
    toast.success(`Claimed ${claimable.length} rewards`, { description: `+${totalCoins.toLocaleString('en-US')} coins added to your wallet` });
  }

  function archive(m: Mail) {
    setMail((prev) => prev.map((x) => (x.id === m.id ? { ...x, archived: true, unread: false } : x)));
    if (openId === m.id) setOpenId('');
    toast('Message archived');
  }

  function unarchive(m: Mail) {
    setMail((prev) => prev.map((x) => (x.id === m.id ? { ...x, archived: false } : x)));
    toast('Restored to inbox');
  }

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-aurora opacity-20" />

      <PageHeader
        title="Mailbox"
        description="Rewards, invitations, gifts and news"
        action={
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <Badge variant="featured" className="gap-1.5 px-3 py-1">
                <Mail className="h-3.5 w-3.5" /> {unreadCount} unread
              </Badge>
            ) : null}
            <Button variant="gold" size="sm" onClick={claimAll} disabled={unclaimedCount === 0}>
              <Coins className="h-4 w-4" /> Claim all{unclaimedCount > 0 ? ` (${unclaimedCount})` : ''}
            </Button>
          </div>
        }
      />

      {/* Type filter tabs */}
      <div className="glass flex flex-wrap gap-1.5 rounded-2xl p-1.5">
        {TABS.map((t) => {
          const active = t === tab;
          const count = t === 'All' ? inbox.length : inbox.filter((m) => m.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:text-sm',
                active ? 'text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {active ? (
                <motion.span layoutId="mail-pill" className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-primary to-violet shadow-glow-sm" transition={{ type: 'spring', stiffness: 320, damping: 28 }} />
              ) : null}
              {t}
              <span className={cn('rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums', active ? 'bg-white/20' : 'bg-black/5')}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Mail list */}
        <div className="card-premium overflow-hidden p-2">
          <AnimatePresence initial={false} mode="popLayout">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No messages in this category.</p>
            ) : (
              filtered.map((m) => {
                const meta = TYPE_META[m.type];
                const active = m.id === openId;
                return (
                  <motion.button
                    key={m.id}
                    layout
                    type="button"
                    onClick={() => selectMail(m)}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0 }}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors',
                      active ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : 'hover:bg-black/[0.03]',
                    )}
                  >
                    <span className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-glow-sm', meta.grad)}>
                      <MailIcon name={m.icon} className="h-5 w-5" />
                      {m.unread ? <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-destructive ring-2 ring-white" /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate text-sm', m.unread ? 'font-bold' : 'font-medium')}>{m.from}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{m.time}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{m.subject}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge variant={meta.badge} className="h-4 px-1.5 text-[9px]">{m.type}</Badge>
                        {m.reward ? (
                          <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold', m.claimed ? 'text-muted-foreground line-through' : meta.text)}>
                            <Coins className="h-3 w-3" />
                            {m.reward.coins ? m.reward.coins.toLocaleString('en-US') : m.reward.item}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Reading pane */}
        <div className="card-premium sheen relative min-h-[22rem] overflow-hidden p-6">
          <AnimatePresence mode="wait">
            {open && !open.archived ? (
              <motion.div key={open.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex h-full flex-col">
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-glow', TYPE_META[open.type].grad)}>
                    <MailIcon name={open.icon} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={TYPE_META[open.type].badge}>{open.type}</Badge>
                      <span className="text-xs text-muted-foreground">{open.time}</span>
                    </div>
                    <h2 className="mt-1.5 font-display text-lg font-bold leading-snug">{open.subject}</h2>
                    <p className="text-xs text-muted-foreground">From {open.from}</p>
                  </div>
                </div>

                <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/80">{open.body}</p>

                {open.reward ? (
                  <div className="mt-4 glass rounded-2xl border border-gold/30 p-4 shadow-glow-gold">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold">
                      <Sparkles className="h-3.5 w-3.5" /> Attached reward
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {open.reward.coins ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums text-gold">
                          <Coins className="h-5 w-5" />
                          <AnimatedNumber value={open.reward.coins} /> coins
                        </span>
                      ) : null}
                      {open.reward.item ? (
                        <Badge variant="featured" className="gap-1">
                          <Package className="h-3 w-3" /> {open.reward.item}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex items-center gap-2">
                  {open.reward ? (
                    open.claimed ? (
                      <Button variant="outline" disabled className="flex-1">
                        <MailOpen className="h-4 w-4" /> Claimed
                      </Button>
                    ) : (
                      <Button variant="gold" className="flex-1" onClick={() => claim(open)}>
                        <Coins className="h-4 w-4" /> Claim reward
                      </Button>
                    )
                  ) : (
                    <div className="flex-1 text-xs text-muted-foreground">No reward attached.</div>
                  )}
                  <Button variant="glass" size="icon" onClick={() => archive(open)} aria-label="Archive">
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-violet/10 text-primary ring-1 ring-inset ring-primary/20">
                  <MailOpen className="h-8 w-8" />
                </span>
                <p className="mt-3 text-sm font-medium">Select a message to read</p>
                <p className="text-xs text-muted-foreground">Pick any mail from the list on the left.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Archive section */}
      <div className="card-premium overflow-hidden">
        <button
          onClick={() => setShowArchive((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-black/[0.03]"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Archive className="h-4 w-4 text-muted-foreground" /> Archive
            <Badge variant="outline" className="font-mono tabular-nums">{archived.length}</Badge>
          </span>
          <span className="text-xs text-muted-foreground">{showArchive ? 'Hide' : 'Show'}</span>
        </button>
        <AnimatePresence initial={false}>
          {showArchive ? (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-1 border-t border-black/5 p-2">
                {archived.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Archive is empty.</p>
                ) : (
                  archived.map((m) => {
                    const meta = TYPE_META[m.type];
                    return (
                      <div key={m.id} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-black/[0.03]">
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white', meta.grad)}>
                          <MailIcon name={m.icon} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.subject}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{m.from} · {m.time}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => unarchive(m)}>
                          <ArchiveRestore className="h-4 w-4" /> Restore
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
