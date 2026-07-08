'use client';

import { Badge, cn } from '@gaming-platform/ui';
import Link from 'next/link';

import { useIsMobile } from '@/hooks/use-is-mobile';
import type { Match } from '@/lib/sports-api';
import { competitionMeta, liveScore, matchClock } from '@/lib/sports-mock';
import { MatchCard, OddsButton, TeamCrest } from './match-card';

/**
 * Dedicated mobile sportsbook card (Phase 1.5.2). Built for phones — full-width,
 * generously spaced, large equal-width odds buttons (≥ 44px) and a full-width
 * markets button. The desktop `MatchCard` is left completely untouched; the
 * `ResponsiveMatchCard` below picks between them so only one mounts per viewport.
 *
 * Structure: League · Live · Time → Home → Away → Score/Status → Odds row
 * (HOME / DRAW / AWAY) → Markets button.
 */
function shortStart(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MobileMatchCard({ match, featured = false }: { match: Match; featured?: boolean }) {
  const mainMarket = match.markets[0];
  const isLive = match.status === 'live';
  const meta = competitionMeta(match.competitionKey);
  const score = isLive ? liveScore(match.id) : undefined;
  const clock = isLive ? matchClock(match.id) : undefined;

  const home = match.participants.find((p) => p.side === 'home') ?? match.participants[0];
  const away = match.participants.find((p) => p.side === 'away') ?? match.participants[1];

  return (
    <div
      className={cn(
        'card-premium relative overflow-hidden rounded-2xl p-4',
        featured && 'ring-1 ring-primary/30',
      )}
    >
      {/* League · live · time */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span aria-hidden>{meta.flag}</span>
          <span className="truncate">{meta.name}</span>
        </span>
        {isLive ? (
          <Badge variant="live" className="shrink-0 gap-1">
            <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-destructive" />
            {clock ?? 'LIVE'}
          </Badge>
        ) : (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {shortStart(match.startTime)}
          </span>
        )}
      </div>

      {/* Teams + score */}
      <Link href={`/sportsbook/${match.id}`} className="block space-y-2.5">
        {[home, away].map((p, i) =>
          p ? (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <TeamCrest participant={p} />
                <span className="truncate text-[15px] font-bold text-foreground">{p.name}</span>
              </span>
              {score ? (
                <span className="shrink-0 font-mono text-xl font-extrabold tabular-nums text-foreground">
                  {i === 0 ? score[0] : score[1]}
                </span>
              ) : null}
            </div>
          ) : null,
        )}
      </Link>

      {/* Odds row: HOME / DRAW / AWAY — large, equal width, ≥ 44px */}
      {mainMarket ? (
        <div className="mt-4 space-y-1.5">
          <p className="text-[11px] uppercase tracking-wider text-accent">{mainMarket.name}</p>
          <div className="grid grid-cols-3 gap-2">
            {mainMarket.selections.slice(0, 3).map((s) => (
              <OddsButton key={s.id} match={match} market={mainMarket} selection={s} />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No markets open.</p>
      )}

      {/* Full-width markets button */}
      <Link
        href={`/sportsbook/${match.id}`}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-xl border border-accent/30 bg-accent/5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
      >
        All {match.markets.length} markets →
      </Link>
    </div>
  );
}

/** Picks the mobile or desktop match card so only one mounts per viewport. */
export function ResponsiveMatchCard({ match, featured }: { match: Match; featured?: boolean }) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <MobileMatchCard match={match} featured={featured} />
  ) : (
    <MatchCard match={match} featured={featured} />
  );
}
