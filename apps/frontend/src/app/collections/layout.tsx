import { AuthGuard } from '@/components/auth/auth-guard';

/** Collections show game content, so this route is authenticated-only (Phase 1.1). */
export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
