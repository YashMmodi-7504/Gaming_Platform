'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@gaming-platform/ui';
import { Check, SlidersHorizontal } from 'lucide-react';

import type { SportDefinition } from '@/lib/sports-api';
import { SPORT_EMOJI } from '@/lib/sports-mock';

type Tab = 'live' | 'upcoming' | 'mybets';

const VIEWS: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'mybets', label: 'My Bets' },
];

/**
 * Compact advanced-filter dropdown for the sportsbook (Phase 1.5.5).
 *
 * Sits beside the quick-access sport chips so the chip row no longer has to
 * carry the whole taxonomy. It ONLY drives the sportsbook's EXISTING state
 * (view tab + selected sport) — no new filtering/odds/markets logic — so betting
 * behaviour is unchanged. Electric-blue accent (the sportsbook brand tone).
 */
export function SportsbookFilter({
  sportList,
  sport,
  setSport,
  tab,
  setTab,
}: {
  sportList: SportDefinition[];
  sport: string | null;
  setSport: (key: string | null) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Filter matches"
          className="flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 text-xs font-bold text-accent outline-none transition-colors hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh] w-56 overflow-y-auto">
        <DropdownMenuLabel>View</DropdownMenuLabel>
        {VIEWS.map((v) => (
          <DropdownMenuItem
            key={v.key}
            onClick={() => setTab(v.key)}
            className="flex items-center justify-between gap-2"
          >
            {v.label}
            {tab === v.key ? <Check className="h-4 w-4 text-accent" /> : null}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Sport</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setSport(null)}
          className="flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">🏆 All Sports</span>
          {sport === null ? <Check className="h-4 w-4 text-accent" /> : null}
        </DropdownMenuItem>
        {sportList.map((s) => (
          <DropdownMenuItem
            key={s.key}
            onClick={() => setSport(s.key)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden>{SPORT_EMOJI[s.key] ?? '🏅'}</span>
              <span className="truncate">{s.name}</span>
            </span>
            {sport === s.key ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
