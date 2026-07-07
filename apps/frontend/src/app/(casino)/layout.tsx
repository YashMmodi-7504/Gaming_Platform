import { AuthGuard } from '@/components/auth/auth-guard';

/**
 * Immersive casino layout: full-bleed, no dashboard chrome. The themed static
 * background is supplied per-route by RouteBackground, so this shell stays
 * transparent and simply provides a scrollable full-height stage. The lobby and
 * tables render their own headers. Guarded: guests → /login (Phase 1.1).
 */
export default function CasinoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="relative h-screen overflow-y-auto overflow-x-hidden">{children}</div>
    </AuthGuard>
  );
}
