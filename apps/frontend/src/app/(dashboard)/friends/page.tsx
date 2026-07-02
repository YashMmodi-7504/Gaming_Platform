'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Gamepad2,
  History,
  Search,
  Send,
  Sparkles,
  Users,
  UserPlus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PresenceBadge } from '@/components/presence/presence-badge';
import { avatarGradient, friends, initials, type Friend } from '@/lib/ecosystem-data';
import { presenceFor } from '@/lib/player-presence';

/* ---- Avatar ------------------------------------------------------------- */

function Avatar({ friend, size = 'md' }: { friend: Friend; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-14 w-14 text-base' : 'h-11 w-11 text-sm';
  return (
    <div className="relative shrink-0">
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white shadow-glow-sm',
          dim,
          avatarGradient(friend.seed),
        )}
      >
        {initials(friend.name)}
      </span>
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
          friend.online ? 'bg-emerald shadow-glow-sm' : 'bg-muted-foreground/50',
        )}
        aria-label={friend.online ? 'online' : 'offline'}
      />
    </div>
  );
}

/* ---- Friend row --------------------------------------------------------- */

function FriendRow({ friend }: { friend: Friend }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.22 }}
      className={cn(
        'group flex items-center gap-3 rounded-xl border p-3.5 transition-all hover:-translate-y-0.5',
        friend.online
          ? 'glass border-black/10 hover:shadow-glow-sm'
          : 'border-black/[0.06] bg-white/[0.02] hover:bg-black/5',
      )}
    >
      <Avatar friend={friend} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{friend.name}</p>
          <span className="text-sm leading-none">{friend.flag}</span>
          <Badge variant="outline" className="ml-1 font-mono text-[10px] tabular-nums">
            Lv {friend.level}
          </Badge>
        </div>
        <div className="mt-1">
          <PresenceBadge presence={presenceFor(friend.seed, friend.online)} showElapsed />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="glass"
          onClick={() => toast.success(`Invite sent to ${friend.name}`)}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Invite
        </Button>
        <Button
          size="sm"
          variant={friend.online ? 'gradient' : 'outline'}
          disabled={!friend.online}
          onClick={() => toast(`Spectating ${friend.name}`, { icon: '👀' })}
        >
          <Gamepad2 className="mr-1.5 h-3.5 w-3.5" />
          Spectate
        </Button>
      </div>
    </motion.div>
  );
}

/* ---- Page --------------------------------------------------------------- */

export default function FriendsPage() {
  const all = useMemo(() => friends(), []);
  const [query, setQuery] = useState('');

  const online = all.filter((f) => f.online);
  const offline = all.filter((f) => !f.online);
  // "Recently played with" — a deterministic slice reusing online friends first.
  const recent = [...online, ...offline].slice(0, 6);

  const addFriend = () => {
    const name = query.trim();
    if (!name) {
      toast.error('Enter a username to add');
      return;
    }
    toast.success(`Friend request sent to ${name}`);
    setQuery('');
  };

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35]" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-violet text-white shadow-glow">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold text-gradient">Friends</h1>
              <Badge variant="success" className="font-mono tabular-nums">
                {online.length} online
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{all.length}</span> friends · squad up and spectate live runs.
            </p>
          </div>
        </div>

        <Badge variant="neon" className="hidden sm:inline-flex">
          <Sparkles className="mr-1 h-3 w-3" />
          Social beta
        </Badge>
      </div>

      {/* Add friend (visual only) */}
      <div className="card-premium sheen flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white/[0.03] px-3 py-2 focus-within:border-primary/50 focus-within:shadow-glow-sm">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addFriend();
            }}
            placeholder="Add a friend by username…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button variant="gradient" onClick={addFriend}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Add friend
        </Button>
      </div>

      {/* Recently played with */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Recently played with
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {recent.map((f) => (
            <motion.button
              key={`recent-${f.seed}`}
              type="button"
              whileHover={{ y: -3 }}
              onClick={() => toast(`Say hi to ${f.name}`, { icon: '👋' })}
              className="glass flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl border border-black/10 p-4 text-center transition-shadow hover:shadow-glow-sm"
            >
              <Avatar friend={f} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{f.name}</p>
                <p className="font-mono text-[10px] tabular-nums text-muted-foreground">Lv {f.level}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Online */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald shadow-glow-sm" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-emerald">
            Online — <span className="font-mono tabular-nums">{online.length}</span>
          </h2>
        </div>
        <div className="grid gap-2.5 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {online.map((f) => (
              <FriendRow key={f.seed} friend={f} />
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Offline */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Offline — <span className="font-mono tabular-nums">{offline.length}</span>
          </h2>
        </div>
        <div className="grid gap-2.5 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {offline.map((f) => (
              <FriendRow key={f.seed} friend={f} />
            ))}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
