/**
 * Per-page background — static premium pastel (PPP-13).
 *
 * One clean, static, ultra-light pastel wash per section (95–98% lightness, very
 * low saturation). No animation, no orbs, no floating decor — a calm SaaS-grade
 * surface. Each route gets its own subtle colour identity while sharing the same
 * softness. Fixed behind content; cheap to paint (no blur, no repaint loops).
 */
export type BackgroundVariant =
  | 'home'
  | 'casino'
  | 'games'
  | 'sports'
  | 'leaderboard'
  | 'vip'
  | 'tournament'
  | 'wallet'
  | 'profile'
  | 'community'
  | 'promotions'
  | 'rewards'
  | 'settings'
  | 'crash'
  | 'dice'
  | 'roulette';

/**
 * `[hue, saturation]` per variant. Lightness is fixed high (96.5% → 99%) in the
 * gradient below so every page stays in the same bright, elegant register.
 */
const TINTS: Record<BackgroundVariant, [number, number]> = {
  home: [210, 60], // soft pastel blue
  casino: [264, 48], // soft lavender
  games: [156, 42], // soft mint
  sports: [200, 58], // soft sky blue
  leaderboard: [26, 62], // soft peach
  vip: [45, 58], // gold cream
  tournament: [276, 46], // lilac
  wallet: [40, 30], // beige
  profile: [216, 24], // grey blue
  community: [182, 46], // aqua
  promotions: [340, 52], // rose
  rewards: [46, 30], // ivory
  settings: [220, 12], // light grey
  crash: [222, 55], // indigo-blue
  dice: [186, 46], // teal
  roulette: [348, 50], // rosy red
};

export function PageBackground({ variant }: { variant: BackgroundVariant }) {
  const [h, s] = TINTS[variant];
  // Subtle top→bottom wash: faint pastel tint settling to near-white. Static.
  const background = `linear-gradient(180deg, hsl(${h} ${s}% 96.5%) 0%, hsl(${h} ${Math.max(s - 22, 14)}% 98.5%) 55%, hsl(${h} 30% 99.3%) 100%)`;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background }} />
  );
}
