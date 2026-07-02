/**
 * Deterministic prototype data for the "living world" ecosystem pages
 * (battle pass, events, community, friends). No Date.now()/Math.random() at
 * module scope — everything is seeded so it's stable across SSR/CSR and never
 * empty. Purely presentational; never touches the backend.
 */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed >>> 0;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

const NAMES = [
  'NovaStrike', 'CryptoFox', 'LunaBet', 'PixelKing', 'Zenith', 'Vortex', 'ApexWolf', 'MirageX',
  'GoldRush', 'Phoenix', 'Riptide', 'Onyx', 'Cobalt', 'Specter', 'Blaze', 'Quartz', 'Echo', 'Titan',
  'Neon', 'Cipher', 'Falcon', 'Rogue', 'Saint', 'Viper',
];
const FLAGS = ['🇧🇷', '🇮🇳', '🇬🇧', '🇩🇪', '🇺🇸', '🇯🇵', '🇪🇸', '🇫🇷', '🇰🇷', '🇨🇦', '🇦🇺', '🇳🇬'];
const GRADS = [
  'from-primary to-violet', 'from-accent to-primary', 'from-pink to-violet', 'from-gold to-warning',
  'from-emerald to-accent', 'from-violet to-pink', 'from-primary to-emerald', 'from-accent to-pink',
];

export function avatarGradient(seed: string): string {
  return GRADS[hash(seed) % GRADS.length]!;
}
export function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}
export function flagFor(seed: string): string {
  return FLAGS[hash(seed) % FLAGS.length]!;
}

/* ---- Battle Pass --------------------------------------------------------- */
export type RewardKind = 'coins' | 'xp' | 'badge' | 'title' | 'skin' | 'lootbox' | 'frame' | 'emote';
export interface Tier {
  tier: number;
  free: { kind: RewardKind; label: string };
  premium: { kind: RewardKind; label: string };
  claimed: boolean;
  current: boolean;
}

export const SEASON = { name: 'Season 1 · Neon Rush', tiers: 100, currentTier: 37, endInDays: 23 };

const FREE_CYCLE: { kind: RewardKind; label: (t: number) => string }[] = [
  { kind: 'coins', label: (t) => `${(500 + t * 50).toLocaleString()} Coins` },
  { kind: 'xp', label: (t) => `${100 + t * 10} XP` },
  { kind: 'lootbox', label: () => 'Mystery Box' },
  { kind: 'coins', label: (t) => `${(800 + t * 60).toLocaleString()} Coins` },
  { kind: 'badge', label: () => 'Season Badge' },
];
const PREMIUM_CYCLE: { kind: RewardKind; label: (t: number) => string }[] = [
  { kind: 'skin', label: () => 'Neon Avatar Frame' },
  { kind: 'coins', label: (t) => `${(2000 + t * 120).toLocaleString()} Coins` },
  { kind: 'title', label: () => 'Exclusive Title' },
  { kind: 'emote', label: () => 'Victory Emote' },
  { kind: 'frame', label: () => 'Legendary Frame' },
];

export function battlePassTiers(): Tier[] {
  return Array.from({ length: SEASON.tiers }, (_, i) => {
    const tier = i + 1;
    const f = FREE_CYCLE[i % FREE_CYCLE.length]!;
    const p = PREMIUM_CYCLE[i % PREMIUM_CYCLE.length]!;
    return {
      tier,
      free: { kind: f.kind, label: f.label(tier) },
      premium: { kind: p.kind, label: p.label(tier) },
      claimed: tier < SEASON.currentTier,
      current: tier === SEASON.currentTier,
    };
  });
}

/* ---- Live Events --------------------------------------------------------- */
export interface GameEvent {
  id: string;
  name: string;
  desc: string;
  icon: string; // lucide name
  href: string;
  gradient: string;
  status: 'live' | 'soon';
  /** Seconds remaining (deterministic seed; ticked client-side). */
  seconds: number;
  reward: string;
}

export function liveEvents(): GameEvent[] {
  return [
    { id: 'weekend-tourney', name: 'Weekend Showdown', desc: 'Climb the crash leaderboard for a $1M pool', icon: 'Trophy', href: '/tournaments', gradient: 'from-primary to-violet', status: 'live', seconds: 2 * 3600 + 540, reward: '$1,000,000' },
    { id: 'happy-hour', name: 'Happy Hour', desc: 'Double rewards on every win', icon: 'Sparkles', href: '/casino', gradient: 'from-gold to-warning', status: 'live', seconds: 42 * 60, reward: '2× rewards' },
    { id: 'crash-madness', name: 'Crash Madness', desc: 'Boosted multipliers all session', icon: 'Rocket', href: '/crash', gradient: 'from-pink to-violet', status: 'live', seconds: 78 * 60, reward: 'Boosted ×' },
    { id: 'roulette-night', name: 'Roulette Night', desc: 'Hot-number bonus payouts', icon: 'CircleDot', href: '/roulette', gradient: 'from-destructive to-warning', status: 'soon', seconds: 3 * 3600 + 1200, reward: 'Bonus payout' },
    { id: 'lucky-dice', name: 'Lucky Dice Hour', desc: 'Every triple pays a jackpot', icon: 'Dice5', href: '/dice', gradient: 'from-emerald to-accent', status: 'soon', seconds: 5 * 3600, reward: 'Jackpot triples' },
    { id: 'double-xp', name: 'Double XP Weekend', desc: 'Earn 2× battle-pass XP', icon: 'Zap', href: '/battle-pass', gradient: 'from-accent to-primary', status: 'soon', seconds: 26 * 3600, reward: '2× XP' },
  ];
}

/* ---- Community ----------------------------------------------------------- */
export interface CommunityPlayer {
  name: string;
  seed: string;
  flag: string;
  level: number;
  value: string;
  meta: string;
}

function player(i: number, r: () => number, meta: (v: number) => string): CommunityPlayer {
  const name = NAMES[i % NAMES.length]!;
  const seed = `${name}${i}`;
  const v = Math.floor(r() * 100000);
  return { name, seed, flag: flagFor(seed), level: 5 + (hash(seed) % 90), value: v.toLocaleString(), meta: meta(v) };
}

export function topPlayers(): CommunityPlayer[] {
  const r = rng(hash('top'));
  return Array.from({ length: 8 }, (_, i) => player(i, r, (v) => `$${(v + 20000).toLocaleString()} won`));
}
export function newPlayers(): CommunityPlayer[] {
  const r = rng(hash('new'));
  return Array.from({ length: 6 }, (_, i) => player(i + 10, r, () => 'Joined today'));
}
export function todaysWinners(): CommunityPlayer[] {
  const r = rng(hash('winners'));
  const games = ['Crash', 'Roulette', 'Dice', 'Blackjack', 'Teen Patti'];
  return Array.from({ length: 8 }, (_, i) => {
    const p = player(i + 3, r, () => '');
    return { ...p, meta: `on ${games[i % games.length]}`, value: `$${(2000 + Math.floor(r() * 40000)).toLocaleString()}` };
  });
}

export interface RecentAchievement {
  player: string;
  seed: string;
  flag: string;
  title: string;
  rarity: 'rare' | 'epic' | 'legendary';
  icon: string;
}
export function recentAchievements(): RecentAchievement[] {
  const items: Omit<RecentAchievement, 'player' | 'seed' | 'flag'>[] = [
    { title: 'Crash Legend', rarity: 'epic', icon: 'Rocket' },
    { title: 'Jackpot!', rarity: 'legendary', icon: 'Gem' },
    { title: 'Lucky Seven', rarity: 'rare', icon: 'Sparkles' },
    { title: 'Champion', rarity: 'legendary', icon: 'Trophy' },
    { title: 'Roulette Royalty', rarity: 'epic', icon: 'CircleDot' },
    { title: 'High Roller', rarity: 'rare', icon: 'Coins' },
  ];
  return items.map((it, i) => {
    const name = NAMES[(i + 5) % NAMES.length]!;
    const seed = `${name}ach${i}`;
    return { ...it, player: name, seed, flag: flagFor(seed) };
  });
}

/* ---- Friends ------------------------------------------------------------- */
export interface Friend {
  name: string;
  seed: string;
  flag: string;
  level: number;
  online: boolean;
  status: string;
}
export function friends(): Friend[] {
  const games = ['Playing Crash', 'In a tournament', 'Playing Roulette', 'Playing Dice', 'In the lobby'];
  return NAMES.slice(0, 14).map((name, i) => {
    const seed = `${name}fr${i}`;
    const online = hash(seed) % 3 !== 0;
    return {
      name,
      seed,
      flag: flagFor(seed),
      level: 8 + (hash(seed) % 80),
      online,
      status: online ? games[hash(seed) % games.length]! : `Last seen ${1 + (hash(seed) % 22)}h ago`,
    };
  });
}
