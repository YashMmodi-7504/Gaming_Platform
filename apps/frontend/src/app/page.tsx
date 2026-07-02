import { Footer } from '@/components/layout/footer';
import { MarketingHeader } from '@/components/layout/marketing-header';
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

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main id="main-content" className="flex-1">
        <Hero />
        <div className="mx-auto w-full max-w-[1440px] space-y-14 px-4 pb-16 sm:px-6">
          {/* Top scrolling marquee of live activity */}
          <LiveTicker />
          <LiveNow />
          <BigWinners />
          <JackpotBanner />
          {/* API-driven game shelves (featured carousel, trending, popular, …) */}
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
      </main>
      <Footer />
      {/* Floating live notifications (bottom-left, deterministic queue) */}
      <FloatingNotifications />
    </div>
  );
}
