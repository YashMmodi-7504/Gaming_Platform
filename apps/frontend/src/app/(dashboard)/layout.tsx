import { AuthGuard } from '@/components/auth/auth-guard';
import { LiveActivityDock } from '@/components/live/live-activity-dock';
import { SiteHeader } from '@/components/layout/site-header';

/**
 * Authenticated player shell. Premium gaming top bar (no enterprise sidebar) +
 * a centered content stage that lets the ambient background show through.
 * Guarded: guests are redirected to /login (Phase 1.1).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-[1440px] flex-1 overflow-x-clip px-4 py-6 sm:px-6 md:py-8">
        {children}
      </main>
      <LiveActivityDock />
    </div>
    </AuthGuard>
  );
}
