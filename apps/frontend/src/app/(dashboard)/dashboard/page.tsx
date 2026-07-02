import { redirect } from 'next/navigation';

/**
 * The player dashboard has been removed — players land directly in the gaming
 * home. This route permanently redirects there so existing links, bookmarks and
 * any post-login redirects resolve cleanly. (Admin analytics live under /admin.)
 */
export default function DashboardRedirect() {
  redirect('/');
}
