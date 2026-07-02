/**
 * Registry of playable prototype games (card + arcade). Drives the game-detail
 * route `/arcade/[slug]` and the catalog. Component loading lives in the route
 * (literal next/dynamic imports); this file holds the presentational metadata.
 */
export type GameCategory = 'Card' | 'Arcade';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface PrototypeGame {
  slug: string;
  title: string;
  category: GameCategory;
  icon: string; // lucide name
  gradient: string;
  tagline: string;
  description: string;
  rules: string[];
  controls: string[];
  difficulty: Difficulty;
  playTime: string;
  related: string[];
}

export const PROTOTYPE_GAMES: PrototypeGame[] = [
  {
    slug: 'blackjack', title: 'Blackjack', category: 'Card', icon: 'Spade', gradient: 'from-primary to-violet',
    tagline: 'Beat the dealer to 21', difficulty: 'Medium', playTime: '2–5 min',
    description: 'The classic casino card game. Draw cards to get as close to 21 as possible without going over, and beat the dealer’s hand.',
    rules: ['Cards are worth their number; face cards = 10; Ace = 1 or 11.', 'Blackjack (Ace + ten) pays 3:2.', 'Dealer hits until 17. Bust = over 21 loses.', 'Double doubles your bet for exactly one more card.'],
    controls: ['Set your bet, then Deal', 'Hit to draw, Stand to hold', 'Double to raise & draw one'],
    related: ['baccarat', 'casino-war', 'teen-patti'],
  },
  {
    slug: 'baccarat', title: 'Baccarat', category: 'Card', icon: 'Diamond', gradient: 'from-gold to-warning',
    tagline: 'Player, Banker or Tie', difficulty: 'Easy', playTime: '1–2 min',
    description: 'A game of pure chance and elegance. Bet on the Player or Banker hand closest to 9 — or a Tie.',
    rules: ['Cards 2–9 face value, 10/face = 0, Ace = 1. Totals wrap mod 10.', 'Player 2×, Banker 1.95× (commission), Tie 9×.', 'Naturals (8/9) stand; otherwise the third-card rule applies.'],
    controls: ['Pick Player / Banker / Tie', 'Set bet and Deal'],
    related: ['dragon-tiger', 'blackjack', 'lucky-7'],
  },
  {
    slug: 'dragon-tiger', title: 'Dragon Tiger', category: 'Card', icon: 'Flame', gradient: 'from-destructive to-warning',
    tagline: 'One card, high wins', difficulty: 'Easy', playTime: '30 sec',
    description: 'The fastest card game in the casino. One card to Dragon, one to Tiger — the higher card wins.',
    rules: ['Highest single card wins (Ace high).', 'Dragon / Tiger pay 2×, Tie pays 9×.'],
    controls: ['Bet Dragon, Tiger or Tie', 'Deal and reveal'],
    related: ['baccarat', 'andar-bahar', 'casino-war'],
  },
  {
    slug: 'andar-bahar', title: 'Andar Bahar', category: 'Card', icon: 'Layers', gradient: 'from-accent to-primary',
    tagline: 'Which side matches?', difficulty: 'Easy', playTime: '1 min',
    description: 'A beloved Indian card game. A joker is drawn, then cards deal alternately to Andar and Bahar until one matches the joker’s rank.',
    rules: ['A game card (joker) sets the target rank.', 'Cards deal alternately; first side to match the rank wins.', 'Bet Andar (~1.9×) or Bahar (~2×).'],
    controls: ['Bet Andar or Bahar', 'Deal and watch the reveal'],
    related: ['dragon-tiger', 'lucky-7', 'teen-patti'],
  },
  {
    slug: 'lucky-7', title: 'Lucky 7', category: 'Card', icon: 'Clover', gradient: 'from-emerald to-accent',
    tagline: 'Under, over or lucky seven', difficulty: 'Easy', playTime: '30 sec',
    description: 'Draw a single card and bet whether its value lands under 7, over 7, or exactly on lucky seven.',
    rules: ['Card value 1–13 (A=1 … K=13).', 'Under 7 and Over 7 pay 2×.', 'Exactly 7 pays 11×.'],
    controls: ['Pick Under 7 / Lucky 7 / Over 7', 'Set bet and Draw'],
    related: ['dragon-tiger', 'baccarat', 'casino-war'],
  },
  {
    slug: 'casino-war', title: 'Casino War', category: 'Card', icon: 'Swords', gradient: 'from-pink to-violet',
    tagline: 'High card takes it', difficulty: 'Easy', playTime: '1 min',
    description: 'The simplest duel in the house — your card vs the dealer’s. High card wins, ties go to War.',
    rules: ['Higher card wins, pays 2×.', 'On a tie you may go to War: double the bet and compare again.'],
    controls: ['Set bet and Deal', 'On a tie: Go to War or Fold'],
    related: ['dragon-tiger', 'lucky-7', 'blackjack'],
  },
  {
    slug: 'teen-patti', title: 'Teen Patti', category: 'Card', icon: 'Spade', gradient: 'from-violet to-pink',
    tagline: '3-card Indian poker', difficulty: 'Medium', playTime: '2 min',
    description: 'Three-card poker, Indian style. Beat the dealer’s hand with the best trail, sequence, colour or pair.',
    rules: ['Rank: Trail > Pure Sequence > Sequence > Colour > Pair > High Card.', 'Beat the dealer to win ~2× plus a hand-rank bonus.'],
    controls: ['Set bet and Deal', 'Reveal and compare hands'],
    related: ['blackjack', 'casino-war', 'andar-bahar'],
  },
  {
    slug: 'plinko', title: 'Plinko', category: 'Arcade', icon: 'CircleDot', gradient: 'from-gold to-pink',
    tagline: 'Drop the ball, hit the multiplier', difficulty: 'Easy', playTime: '15 sec',
    description: 'Drop a ball through a field of pegs and watch it bounce into a multiplier slot. Edges pay big.',
    rules: ['The ball lands in a slot worth 0.4× to 16×.', 'Your payout = bet × the slot multiplier.'],
    controls: ['Set your bet', 'Drop the ball'],
    related: ['color-match', 'reaction', '2048'],
  },
  {
    slug: '2048', title: '2048', category: 'Arcade', icon: 'Grid3x3', gradient: 'from-accent to-primary',
    tagline: 'Merge tiles to 2048', difficulty: 'Medium', playTime: '3–8 min',
    description: 'Slide numbered tiles to merge matching pairs. Reach 2048 — and earn coins for your score.',
    rules: ['Equal tiles merge into their sum.', 'Higher scores earn more demo coins & XP.'],
    controls: ['Arrow keys / WASD to move', 'On-screen arrows on mobile'],
    related: ['memory', 'color-match', 'reaction'],
  },
  {
    slug: 'memory', title: 'Memory Match', category: 'Arcade', icon: 'Brain', gradient: 'from-violet to-accent',
    tagline: 'Find every pair', difficulty: 'Easy', playTime: '2–4 min',
    description: 'Flip cards two at a time and match all the pairs in as few moves as possible.',
    rules: ['Match all pairs to win.', 'Fewer moves = bigger reward.'],
    controls: ['Tap a card to flip it', 'Match two to clear them'],
    related: ['2048', 'reaction', 'color-match'],
  },
  {
    slug: 'reaction', title: 'Reaction Test', category: 'Arcade', icon: 'Zap', gradient: 'from-pink to-primary',
    tagline: 'How fast are you?', difficulty: 'Easy', playTime: '30 sec',
    description: 'Wait for green, then tap as fast as you can. Beat your best reaction time to earn coins.',
    rules: ['Tap the instant the screen turns green.', 'Tapping early is a fault. Faster = more coins.'],
    controls: ['Start, then tap on green'],
    related: ['color-match', 'memory', 'plinko'],
  },
  {
    slug: 'color-match', title: 'Color Match', category: 'Arcade', icon: 'Palette', gradient: 'from-emerald to-pink',
    tagline: 'Match before the timer', difficulty: 'Medium', playTime: '1–3 min',
    description: 'Tap the swatch that matches the target before the timer runs out. Build a combo streak for bonus coins.',
    rules: ['Match the target colour to score.', 'The clock speeds up — keep your streak alive.'],
    controls: ['Tap the matching swatch', 'Beat the timer for combos'],
    related: ['reaction', 'memory', '2048'],
  },
];

export function prototypeBySlug(slug: string): PrototypeGame | undefined {
  return PROTOTYPE_GAMES.find((g) => g.slug === slug);
}

/** Deterministic "players online" for a game (stable across SSR/CSR). */
export function playersOnline(slug: string): number {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 120 + (h % 1880);
}
