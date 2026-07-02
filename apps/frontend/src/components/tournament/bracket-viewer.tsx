'use client';

import { cn } from '@gaming-platform/ui';

import type { BracketMatch } from '@/lib/tournament-api';

interface BracketViewerProps {
  matches: BracketMatch[];
  names: Map<string, string>;
}

/**
 * Bracket viewer. Renders matches grouped into rounds (left → right) with the
 * winner of each match highlighted. Supports winners/losers/final sub-brackets.
 */
export function BracketViewer({ matches, names }: BracketViewerProps) {
  const buckets = groupByBracket(matches);

  return (
    <div className="space-y-6">
      {buckets.map(({ bracket, rounds }) => (
        <div key={bracket}>
          {buckets.length > 1 ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">
              {bracket} bracket
            </p>
          ) : null}
          <div className="flex gap-6 overflow-x-auto pb-2">
            {rounds.map((round) => (
              <div key={round.round} className="flex min-w-[200px] flex-col justify-around gap-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Round {round.round}
                </p>
                {round.matches.map((m) => (
                  <MatchCard key={m.id} match={m} names={names} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ match, names }: { match: BracketMatch; names: Map<string, string> }) {
  return (
    <div className="card-premium relative overflow-hidden rounded-xl text-sm transition-shadow hover:shadow-glow-sm">
      {match.slots.map((slot, i) => {
        const id = slot.participantId;
        const isWinner = match.winnerId && match.winnerId === id;
        return (
          <div
            key={i}
            className={cn(
              'flex items-center justify-between px-3 py-2 transition-colors',
              i === 0 && 'border-b border-black/10',
              isWinner
                ? 'bg-gradient-to-r from-primary/25 to-accent/10 font-semibold text-foreground'
                : 'text-muted-foreground',
            )}
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              {isWinner ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-glow-neon" /> : null}
              <span className="truncate">{id ? names.get(id) ?? id.slice(0, 6) : '—'}</span>
            </span>
            <span className={cn('font-mono tabular-nums', isWinner && 'text-accent')}>{slot.score ?? ''}</span>
          </div>
        );
      })}
    </div>
  );
}

function groupByBracket(matches: BracketMatch[]) {
  const byBracket = new Map<string, BracketMatch[]>();
  for (const m of matches) {
    const list = byBracket.get(m.bracket) ?? [];
    list.push(m);
    byBracket.set(m.bracket, list);
  }
  const order = ['main', 'winners', 'losers', 'final'];
  return [...byBracket.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([bracket, ms]) => {
      const byRound = new Map<number, BracketMatch[]>();
      for (const m of ms) {
        const list = byRound.get(m.round) ?? [];
        list.push(m);
        byRound.set(m.round, list);
      }
      const rounds = [...byRound.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([round, matchesInRound]) => ({
          round,
          matches: matchesInRound.sort((x, y) => x.position - y.position),
        }));
      return { bracket, rounds };
    });
}
