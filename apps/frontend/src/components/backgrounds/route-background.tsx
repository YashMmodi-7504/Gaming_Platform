'use client';

import { usePathname } from 'next/navigation';

import { CinematicBackground } from '@/components/layout/cinematic-background';
import { PageBackground, type BackgroundVariant } from './page-background';

/**
 * Chooses the immersive background per route. Mounted once in the root layout so
 * every page gets its own themed, animated scene. The home/marketing pages keep
 * the multi-scene cinematic background.
 */
function variantFor(path: string): BackgroundVariant | null {
  if (path.startsWith('/casino')) return 'casino';
  if (path.startsWith('/crash')) return 'crash';
  if (path.startsWith('/dice')) return 'dice';
  if (path.startsWith('/roulette')) return 'roulette';
  if (path.startsWith('/sportsbook')) return 'sports';
  if (path.startsWith('/leaderboards')) return 'esports';
  if (path.startsWith('/tournaments')) return 'esports';
  if (path.startsWith('/vip')) return 'casino';
  if (path.startsWith('/events') || path.startsWith('/career')) return 'esports';
  if (path.startsWith('/profile')) return 'esports';
  if (path.startsWith('/battle-pass') || path.startsWith('/community')) return 'esports';
  if (path.startsWith('/daily') || path.startsWith('/missions')) return 'casino';
  if (path.startsWith('/friends') || path.startsWith('/notifications')) return 'arcade';
  if (path.startsWith('/trophies') || path.startsWith('/hall-of-fame') || path.startsWith('/clans')) return 'esports';
  if (path.startsWith('/store') || path.startsWith('/marketplace')) return 'casino';
  if (path.startsWith('/avatar') || path.startsWith('/stats') || path.startsWith('/feed') || path.startsWith('/mailbox')) return 'arcade';
  if (
    path.startsWith('/games') ||
    path.startsWith('/discover') ||
    path.startsWith('/arcade') ||
    path.startsWith('/favorites') ||
    path.startsWith('/collections')
  )
    return 'arcade';
  if (path.startsWith('/rewards') || path.startsWith('/wallet')) return 'casino';
  return null;
}

export function RouteBackground() {
  const pathname = usePathname();
  const variant = variantFor(pathname ?? '/');
  if (!variant) return <CinematicBackground />;
  return <PageBackground variant={variant} />;
}
