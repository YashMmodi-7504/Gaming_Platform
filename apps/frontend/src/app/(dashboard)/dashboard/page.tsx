import { HomeSections } from '@/components/games/home-sections';
import { FloatingNotifications } from '@/components/live/floating-notifications';
import { GlobalLiveFeed } from '@/components/live/global-live-feed';
import { LiveNow } from '@/components/live/live-now';
import { LiveTicker } from '@/components/live/live-ticker';
import { Hero } from '@/components/marketing/hero';
import {
  JackpotBanner,
  LiveWinners,
  Promotions,
  Testimonials,
  TournamentSpotlight,
} from '@/components/marketing/landing-sections';
import {
  BigWinners,
  JackpotWinners,
  LiveTournaments,
  SportsHighlights,
  UpcomingEvents,
  VIPGames,
} from '@/components/marketing/lobby-sections';

/**
 * Authenticated gaming home (Phase 1.1). This is the player dashboard reached
 * after login — the full lobby experience that previously lived at "/". It runs
 * inside the guarded (dashboard) layout (SiteHeader + AuthGuard), so guests
 * never reach it. The public marketing landing now owns "/".
 */
export default function DashboardPage() {
  return (
    <>
      <div className="space-y-14 pb-4">
        <Hero />
        <LiveTicker />
        <LiveNow />
        <BigWinners />
        <JackpotBanner />
        <HomeSections />
        <LiveTournaments />
        <GlobalLiveFeed />
        <SportsHighlights />
        <JackpotWinners />
        <VIPGames />
        <Promotions />
        <TournamentSpotlight />
        <UpcomingEvents />
        <LiveWinners />
        <Testimonials />
      </div>
      <FloatingNotifications />
    </>
  );
}
