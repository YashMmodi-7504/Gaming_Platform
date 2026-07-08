import { DashboardLobbyLazy } from '@/components/dashboard/dashboard-lobby-lazy';
import { PlayerHero, QuickActions } from '@/components/dashboard/player-sections';
import { Hero } from '@/components/marketing/hero';
import { WalletSummary } from '@/components/wallet/wallet-summary';

/**
 * Authenticated player HOME — the premium gaming hub (Phase 1.3.4).
 *
 * Restores the original rich, "alive" homepage (hero, live winners, jackpot,
 * tournaments, providers, community feed, upcoming events) while keeping the
 * Phase 1.x player widgets (welcome, wallet summary, quick actions, recent bets
 * & transactions, VIP progress). ALL promotional content — welcome/reload/
 * cashback/referral bonuses, daily reward, lucky wheel, mystery chest, promo
 * grids + status filters — lives ONLY on /promotions, so the two pages read as
 * clearly different experiences: Dashboard = Gaming Hub, Promotions = Offers.
 *
 * A server-rendered shell (hero, wallet summary, quick actions) paints
 * immediately; the heavy lobby is lazy-loaded (DashboardLobbyLazy) so it never
 * blocks first paint. Every section reuses an existing component — reorganized,
 * not rebuilt.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-12 pb-6">
      {/* 1 — Welcome back */}
      <PlayerHero />

      {/* 2 — Hero banner */}
      <Hero />

      {/* 3 — Wallet summary */}
      <WalletSummary />

      {/* 4 — Quick actions */}
      <QuickActions />

      {/* 5+ — Rich gaming lobby (lazy): shelves, providers, sportsbook, live
          winners, jackpot, tournaments, community, upcoming, recent activity, VIP */}
      <DashboardLobbyLazy />
    </div>
  );
}
