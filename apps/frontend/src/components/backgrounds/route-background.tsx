'use client';

import { usePathname } from 'next/navigation';

import { PageBackground, type BackgroundVariant } from './page-background';

/**
 * Chooses the static pastel background per route (PPP-13). Mounted once in the
 * root layout. Every page — home included — gets a calm, section-specific pastel
 * wash. No animated/cinematic backgrounds anywhere.
 */
function variantFor(path: string): BackgroundVariant {
  // Casino detail/play + lobby all share the lavender identity.
  if (path.startsWith('/casino')) return 'casino';
  if (path.startsWith('/crash')) return 'crash';
  if (path.startsWith('/dice')) return 'dice';
  if (path.startsWith('/roulette')) return 'roulette';
  if (path.startsWith('/sportsbook')) return 'sports';
  if (path.startsWith('/leaderboards') || path.startsWith('/hall-of-fame')) return 'leaderboard';
  if (path.startsWith('/vip')) return 'vip';
  if (path.startsWith('/tournaments') || path.startsWith('/events')) return 'tournament';
  if (path.startsWith('/wallet') || path.startsWith('/transactions')) return 'wallet';
  if (path.startsWith('/profile') || path.startsWith('/avatar') || path.startsWith('/stats') || path.startsWith('/career')) return 'profile';
  if (path.startsWith('/community') || path.startsWith('/friends') || path.startsWith('/clans') || path.startsWith('/feed') || path.startsWith('/social')) return 'community';
  if (path.startsWith('/promotions') || path.startsWith('/daily') || path.startsWith('/missions') || path.startsWith('/battle-pass')) return 'promotions';
  if (path.startsWith('/rewards') || path.startsWith('/store') || path.startsWith('/marketplace') || path.startsWith('/trophies')) return 'rewards';
  if (path.startsWith('/settings') || path.startsWith('/notifications') || path.startsWith('/mailbox')) return 'settings';
  if (
    path.startsWith('/games') ||
    path.startsWith('/discover') ||
    path.startsWith('/arcade') ||
    path.startsWith('/favorites') ||
    path.startsWith('/collections')
  )
    return 'games';
  // Home / marketing / everything else → soft pastel blue.
  return 'home';
}

export function RouteBackground() {
  const pathname = usePathname();
  return <PageBackground variant={variantFor(pathname ?? '/')} />;
}
