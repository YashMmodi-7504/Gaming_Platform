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

/**
 * The rich lower half of the premium gaming Dashboard (Phase 1.3.4).
 *
 * Restores the original lobby experience by REUSING the existing marketing /
 * lobby / live components — game shelves, providers, sportsbook, live winners,
 * jackpot, tournaments, community feed and upcoming events — then the player's
 * own recent activity + VIP progress. NOTHING here is promotional: welcome /
 * reload / cashback / referral bonuses, daily-reward / lucky-wheel / mystery-
 * chest cards and promo status filters live ONLY on /promotions.
 *
 * Loaded lazily by the dashboard shell (see dashboard-lobby-lazy) so it never
 * blocks first paint. Order follows the Phase 1.3.4 target structure.
 */
export function DashboardLobby() {
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
