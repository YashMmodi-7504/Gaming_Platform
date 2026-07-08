import { AuthGuard } from '@/components/auth/auth-guard';
import { BottomNav } from '@/components/layout/bottom-nav';

/**
 * Immersive casino layout: full-bleed, no dashboard chrome. The themed static
 * background is supplied per-route by RouteBackground, so this shell stays
 * transparent and simply provides a scrollable full-height stage. The lobby and
 * tables render their own headers. Guarded: guests → /login (Phase 1.1).
 *
 * On mobile the fixed bottom nav is shown; the scroll stage gets extra bottom
 * padding (max-md:pb-24) so casino content is never hidden behind it.
 */
export default function CasinoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="relative h-screen overflow-y-auto overflow-x-hidden max-md:pb-24">
        {children}
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
