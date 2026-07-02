'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@gaming-platform/ui';
import { Bell, Gift, Sparkles, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';

/** Notifications bell. Always populated (never an empty state) with timely items. */
const NOTES = [
  { icon: Gift, tone: 'text-gold', title: 'Welcome bonus ready', desc: 'Claim 100% up to $500.', time: 'now', href: '/rewards' },
  { icon: Trophy, tone: 'text-primary', title: 'Tournament starting', desc: 'Weekend Showdown in 2h.', time: '12m', href: '/tournaments' },
  { icon: Zap, tone: 'text-pink', title: 'Crash hit 25.3×', desc: 'A player just cashed out big.', time: '24m', href: '/crash' },
  { icon: Sparkles, tone: 'text-accent', title: 'New games added', desc: '8 fresh titles this week.', time: '1h', href: '/games?sort=newest' },
];

export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-black/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pink" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="font-display text-sm font-bold">Notifications</span>
          <span className="rounded-full bg-pink/15 px-2 py-0.5 text-[10px] font-bold text-pink">
            {NOTES.length} new
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto py-1">
          {NOTES.map((n, i) => {
            const Icon = n.icon;
            return (
              <Link
                key={i}
                href={n.href}
                className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-primary/5"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04]">
                  <Icon className={`h-4 w-4 ${n.tone}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span>
              </Link>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <Link
          href="/notifications"
          className="block px-4 py-2.5 text-center text-xs font-semibold text-primary hover:underline"
        >
          View all notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
