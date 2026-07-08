'use client';

import { cn } from '@gaming-platform/ui';
import { Check, ChevronDown, Clock, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { SportDefinition } from '@/lib/sports-api';
import { SPORT_EMOJI } from '@/lib/sports-mock';

/**
 * Premium searchable "Sports" dropdown (Phase 1.5.6) — the single sport-
 * navigation control on every device, replacing the horizontal sport-chip bar.
 *
 * Purpose-built accessible combobox (no Popover/Command primitive in the design
 * system): a dark charcoal pill that shows the active sport, opening a searchable
 * listbox with instant filtering, recently-viewed shortcuts, keyboard support
 * (↑/↓ + Enter, Esc to close), roving `aria-activedescendant` and screen-reader
 * roles. It drives ONLY the sportsbook's existing `setSport` state — no betting/
 * odds/markets logic touched — so the feed updates exactly as before.
 */
interface Opt {
  key: string | null;
  label: string;
  emoji: string;
}

export function SportsSelect({
  sportList,
  sport,
  setSport,
  counts,
  liveSet,
  totalCount,
}: {
  sportList: SportDefinition[];
  sport: string | null;
  setSport: (key: string | null) => void;
  /** Fixture count per sport key (upcoming + live). */
  counts: Record<string, number>;
  /** Sport keys that currently have live fixtures. */
  liveSet: Set<string>;
  /** Total fixtures across all sports (for the "All Sports" row). */
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options: Opt[] = useMemo(
    () => [
      { key: null, label: 'All Sports', emoji: '🏆' },
      ...sportList.map((s) => ({ key: s.key, label: s.name, emoji: SPORT_EMOJI[s.key] ?? '🏅' })),
    ],
    [sportList],
  );

  const currentOpt = options.find((o) => o.key === sport);
  const currentLabel = currentOpt?.label ?? 'Sports';
  const currentEmoji = sport ? currentOpt?.emoji ?? '🏅' : '🏆';

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (q) {
      return options
        .filter((o) => o.label.toLowerCase().includes(q))
        .map((o) => ({ ...o, group: 'all' as const }));
    }
    const recentOpts = recent
      .map((k) => options.find((o) => o.key === k))
      .filter((o): o is Opt => Boolean(o))
      .map((o) => ({ ...o, group: 'recent' as const }));
    return [...recentOpts, ...options.map((o) => ({ ...o, group: 'all' as const }))];
  }, [q, options, recent]);

  // Keep the active index in range as the visible list changes.
  useEffect(() => setActive(0), [query, open]);

  // Focus the search field when the menu opens.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const select = (opt: { key: string | null }) => {
    setSport(opt.key);
    if (opt.key) setRecent((r) => [opt.key as string, ...r.filter((k) => k !== opt.key)].slice(0, 3));
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(visible.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = visible[active];
      if (o) select(o);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sport filter, currently ${currentLabel}`}
        className="flex min-h-[44px] w-[200px] items-center justify-between gap-2 rounded-full border border-white/10 bg-[#1A2238] px-4 text-sm font-bold text-white shadow-[0_6px_20px_-8px_rgba(15,23,42,0.55)] outline-none transition-colors hover:bg-[#222c46] focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-base leading-none">{currentEmoji}</span>
          <span className="truncate">{currentLabel}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/70 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          onKeyDown={onKeyDown}
          className="animate-dropdown-in absolute left-0 top-[calc(100%+8px)] z-50 w-[min(20rem,calc(100vw-2rem))] origin-top overflow-hidden rounded-2xl border border-black/10 bg-white shadow-elevated"
        >
          <div className="flex items-center gap-2 border-b border-black/[0.06] px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sports…"
              aria-label="Search sports"
              role="combobox"
              aria-expanded
              aria-controls="sports-listbox"
              aria-activedescendant={visible[active] ? `sport-opt-${active}` : undefined}
              autoComplete="off"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div
            id="sports-listbox"
            role="listbox"
            aria-label="Sports"
            className="max-h-[min(60vh,20rem)] overflow-y-auto overscroll-contain py-1"
          >
            {visible.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No sports found.</p>
            ) : (
              visible.map((o, i) => {
                const selected = o.key === sport;
                const showRecent = !q && o.group === 'recent' && i === 0;
                const showAll = !q && o.group === 'all' && i > 0 && visible[i - 1]?.group === 'recent';
                return (
                  <div key={`${o.group}-${o.key ?? 'all'}`}>
                    {showRecent ? (
                      <GroupHeader icon={<Clock className="h-3 w-3" />} label="Recently viewed" />
                    ) : null}
                    {showAll ? <GroupHeader label="All sports" /> : null}
                    <button
                      type="button"
                      id={`sport-opt-${i}`}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => select(o)}
                      className={cn(
                        'flex min-h-[44px] w-full items-center justify-between gap-2 px-4 text-sm outline-none transition-colors',
                        i === active ? 'bg-primary/10' : 'hover:bg-black/[0.03]',
                        selected ? 'font-semibold text-primary' : 'text-foreground',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span aria-hidden className="text-base leading-none">{o.emoji}</span>
                        <span className="truncate">{o.label}</span>
                        {o.key && liveSet.has(o.key) ? (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-destructive">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-destructive" /> Live
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {o.key === null ? totalCount : counts[o.key] ?? 0}
                        </span>
                        {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GroupHeader({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <p className="flex items-center gap-1.5 px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {icon}
      {label}
    </p>
  );
}
