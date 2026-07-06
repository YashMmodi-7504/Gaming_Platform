/**
 * Per-page background — a single, solid, visible pastel colour (PPP-13.1).
 *
 * Just `background-color`. No gradients, grids, orbs, blur or animation. Fixed
 * behind all content so each section reads clearly as its own colour; opaque
 * cards/headers sit on top. Colours are subtle (≈95–97% lightness) but clearly
 * tinted — never plain white.
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

/** Solid pastel per section — clearly visible, never white. */
const COLORS: Record<BackgroundVariant, string> = {
  home: '#EAF3FF', // soft pastel blue
  casino: '#F4EDFF', // soft lavender
  games: '#EAFBF1', // soft mint
  sports: '#E8F6FF', // soft sky blue
  leaderboard: '#FFF0E6', // soft peach
  vip: '#FBF3DE', // cream gold
  tournament: '#F3ECFF', // lilac
  wallet: '#FAF3E6', // beige
  profile: '#EDF1F8', // grey blue
  community: '#E3F9F9', // aqua
  promotions: '#FFEDF4', // rose
  rewards: '#FBF5E6', // ivory
  settings: '#EEF0F6', // light grey
  crash: '#E8EEFF', // indigo tint
  dice: '#E4F7F8', // teal tint
  roulette: '#FFEAEF', // rosy red tint
};

export function PageBackground({ variant }: { variant: BackgroundVariant }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ backgroundColor: COLORS[variant] }}
    />
  );
}
