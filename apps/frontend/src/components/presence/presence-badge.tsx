'use client';

import { cn } from '@gaming-platform/ui';
import {
  Circle,
  Clock,
  Eye,
  Gamepad2,
  LayoutGrid,
  type LucideIcon,
  Moon,
  Palette,
  ShoppingBag,
  Tv,
} from 'lucide-react';

import type { Presence, PresenceKind, PresenceTone } from '@/lib/player-presence';

const KIND_ICON: Record<PresenceKind, LucideIcon> = {
  playing: Gamepad2,
  'in-lobby': LayoutGrid,
  watching: Tv,
  spectating: Eye,
  'in-store': ShoppingBag,
  'editing-avatar': Palette,
  away: Moon,
  idle: Clock,
  'recently-active': Circle,
  offline: Circle,
};

const TONE: Record<PresenceTone, { text: string; ring: string; dot: string }> = {
  emerald: { text: 'text-emerald', ring: 'ring-emerald/30 bg-emerald/10', dot: 'bg-emerald' },
  accent: { text: 'text-accent', ring: 'ring-accent/30 bg-accent/10', dot: 'bg-accent' },
  violet: { text: 'text-violet', ring: 'ring-violet/30 bg-violet/10', dot: 'bg-violet' },
  gold: { text: 'text-gold', ring: 'ring-gold/30 bg-gold/10', dot: 'bg-gold' },
  pink: { text: 'text-pink', ring: 'ring-pink/30 bg-pink/10', dot: 'bg-pink' },
  muted: { text: 'text-muted-foreground', ring: 'ring-black/10 bg-black/5', dot: 'bg-muted-foreground/50' },
};

/**
 * Compact, reusable presence pill: a status dot (pulsing when active), a themed
 * kind icon, the status label and (optionally) elapsed time. Fully deterministic
 * — pass a `Presence` from `presenceFor()`.
 */
export function PresenceBadge({
  presence,
  showElapsed = false,
  className,
}: {
  presence: Presence;
  showElapsed?: boolean;
  className?: string;
}) {
  const Icon = KIND_ICON[presence.kind];
  const tone = TONE[presence.tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tone.ring,
        tone.text,
        className,
      )}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        {presence.active ? (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-70', tone.dot)} />
        ) : null}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', tone.dot)} />
      </span>
      <Icon className="h-3 w-3" aria-hidden />
      <span className="truncate">{presence.label}</span>
      {showElapsed && presence.active ? (
        <span className="tabular-nums text-muted-foreground">· {presence.elapsed}</span>
      ) : null}
    </span>
  );
}
