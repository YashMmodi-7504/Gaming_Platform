import { AchievementsPanel } from '@/components/dashboard/dashboard-achievements';
import { NotificationCenter, RecentActivity } from '@/components/dashboard/dashboard-activity';
import { GamingShelves } from '@/components/dashboard/gaming-shelves';
import { PlayerHero, QuickActions } from '@/components/dashboard/player-sections';
import { WalletSummary } from '@/components/wallet/wallet-summary';

/**
 * Authenticated player HOME — the personal control center (Phase 1.4).
 *
 * A server-rendered shell composes independent client widgets, each of which
 * hydrates and mounted-gates on its own, so the shell paints immediately and no
 * single widget blocks first paint. The heavy game-discovery block is lazy-loaded
 * (see GamingShelves). Marketing / offers live on /promotions, so this page is
 * strictly the player's activity hub.
 *
 * Hierarchy (Objective 1): Welcome → Wallet Summary → Quick Actions → Gaming
 * shelves (Continue / Recommended / Popular / Recently / Trending) → Sportsbook
 * → Recent Activity (transactions + bets + notifications) → VIP / Achievements.
 *
 * Reuses: WalletSummary, HomeSections + SportsHighlights (via GamingShelves),
 * the missions store, the player profile and the wallet ledger.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-12 pb-6">
      {/* 1 — Identity + today */}
      <PlayerHero />

      {/* 2 — Wallet summary (balances + today's money + recent transactions) */}
      <WalletSummary />

      {/* 3 — Quick actions */}
      <QuickActions />

      {/* 4 — Gaming shelves + sportsbook (lazy, progressive) */}
      <GamingShelves />

      {/* 5 — Recent activity + notifications */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <RecentActivity />
        <div className="lg:pt-11">
          <NotificationCenter />
        </div>
      </div>

      {/* 6 — Achievements, missions & progress */}
      <AchievementsPanel />
    </div>
  );
}
