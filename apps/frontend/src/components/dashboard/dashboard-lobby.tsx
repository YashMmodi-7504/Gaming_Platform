'use client';

import { ProviderShowcase } from '@/components/casino/provider-showcase';
import {
  RecentBetsCard,
  RecentTransactionsCard,
  VipProgressCard,
} from '@/components/dashboard/player-sections';
import { HomeSections } from '@/components/games/home-sections';
import { GlobalLiveFeed } from '@/components/live/global-live-feed';
import { LiveNow } from '@/components/live/live-now';
import { JackpotBanner, LiveWinners, TournamentSpotlight } from '@/components/marketing/landing-sections';
import { LiveTournaments, SportsHighlights, UpcomingEvents } from '@/components/marketing/lobby-sections';
import { useIsMobile } from '@/hooks/use-is-mobile';

/**
 * The rich lower half of the premium gaming Dashboard (Phase 1.3.4 → 1.5.2).
 *
 * Desktop keeps the full, rich lobby (game shelves, providers, sportsbook, live
 * winners, jackpot, tournaments, community feed, upcoming events) — unchanged.
 * On MOBILE it renders a dedicated LEAN vertical dashboard: game shelves (as
 * adaptive grids), sports highlights + live games (as full-width vertical
 * cards) and the player's recent activity — dropping the horizontal-scroll
 * marketing rails so the phone experience is fully vertical and native.
 *
 * Nothing here is promotional (offers live only on /promotions). Loaded lazily
 * by the dashboard shell so it never blocks first paint.
 */
export function DashboardLobby() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-8">
        {/* Continue Playing · Popular · Trending · Recommended (adaptive grids) */}
        <HomeSections />
        {/* Sports highlights — full-width vertical cards */}
        <SportsHighlights />
        {/* Live games — full-width vertical cards */}
        <LiveNow />
        {/* Player activity — stacks vertically */}
        <div className="space-y-4">
          <RecentBetsCard />
          <RecentTransactionsCard />
          <VipProgressCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Continue Playing · Featured Casino · Trending · Popular · Recommended · Recently */}
      <HomeSections />

      {/* Featured Providers */}
      <ProviderShowcase />

      {/* Sportsbook Highlights */}
      <SportsHighlights />

      {/* Live Activity */}
      <LiveNow />

      {/* Live Winners */}
      <LiveWinners />

      {/* Jackpot Banner */}
      <JackpotBanner />

      {/* Tournament Spotlight + Live Tournaments */}
      <TournamentSpotlight />
      <LiveTournaments />

      {/* Community Highlights */}
      <GlobalLiveFeed />

      {/* Upcoming Events */}
      <UpcomingEvents />

      {/* Recent Bets · Recent Transactions · VIP Progress (player activity) */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RecentBetsCard />
        <RecentTransactionsCard />
        <VipProgressCard />
      </section>
    </div>
  );
}
