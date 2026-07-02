import { create } from 'zustand';

import {
  ALL_COSMETICS,
  type AvatarConfig,
  type CosmeticCategory,
  DEFAULT_AVATAR,
  cosmeticById,
} from '@/lib/cosmetics';
import { useDemoWallet } from './demo-wallet';

/**
 * Client-side player progression + identity (prototype/demo). Deterministic
 * defaults so the profile is NEVER empty. Purely cosmetic — never touches the
 * backend. Cosmetic purchases spend the visible demo-wallet coins.
 */

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string; // lucide icon name (rendered by the page)
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface InventoryItem {
  id: string;
  name: string;
  kind: 'skin' | 'badge' | 'title' | 'lootbox';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  equipped?: boolean;
}

export interface PlayerProfile {
  username: string;
  playerId: string;
  avatarSeed: string;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  dailyStreak: number;
  dailyClaimedToday: boolean;
  seasonTier: number;
  seasonName: string;
  achievements: Achievement[];
  inventory: InventoryItem[];

  // --- Identity / cosmetics (Sprint 4) ---
  country: string; // flag emoji
  status: string;
  favoriteGame: string;
  clan: { name: string; tag: string } | null;
  playMinutes: number;
  joinedDays: number;
  equippedFrame: string;
  equippedTheme: string;
  equippedTitle: string;
  equippedBanner: string;
  owned: string[]; // owned cosmetic ids
  avatar: AvatarConfig;

  setUsername: (name: string) => void;
  addXp: (amount: number) => void;
  claimDaily: () => number;
  unlock: (id: string) => void;
  equip: (id: string) => void;

  isOwned: (id: string) => boolean;
  buy: (id: string) => boolean;
  equipCosmetic: (category: CosmeticCategory, id: string) => void;
  setAvatar: (patch: Partial<AvatarConfig>) => void;
  setStatus: (status: string) => void;
  completion: () => number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-spin', name: 'First Spin', desc: 'Play your first game', icon: 'Play', unlocked: true, rarity: 'common' },
  { id: 'high-roller', name: 'High Roller', desc: 'Wager 10,000 coins', icon: 'Coins', unlocked: true, rarity: 'rare' },
  { id: 'crash-legend', name: 'Crash Legend', desc: 'Cash out at 10x+', icon: 'Rocket', unlocked: true, rarity: 'epic' },
  { id: 'lucky-seven', name: 'Lucky Seven', desc: 'Win 7 rounds in a row', icon: 'Sparkles', unlocked: false, rarity: 'rare' },
  { id: 'roulette-royalty', name: 'Roulette Royalty', desc: 'Hit a straight-up number', icon: 'CircleDot', unlocked: false, rarity: 'epic' },
  { id: 'tournament-champ', name: 'Champion', desc: 'Win a tournament', icon: 'Trophy', unlocked: false, rarity: 'legendary' },
  { id: 'night-owl', name: 'Night Owl', desc: 'Play after midnight', icon: 'Moon', unlocked: true, rarity: 'common' },
  { id: 'jackpot', name: 'Jackpot!', desc: 'Win a jackpot', icon: 'Gem', unlocked: false, rarity: 'legendary' },
];

const INVENTORY: InventoryItem[] = [
  { id: 'skin-neon', name: 'Neon Avatar Frame', kind: 'skin', rarity: 'epic', icon: 'Sparkles', equipped: true },
  { id: 'skin-gold', name: 'Golden Frame', kind: 'skin', rarity: 'legendary', icon: 'Crown' },
  { id: 'badge-founder', name: 'Founder', kind: 'badge', rarity: 'legendary', icon: 'Shield' },
  { id: 'badge-vip', name: 'VIP', kind: 'badge', rarity: 'epic', icon: 'Star', equipped: true },
  { id: 'title-legend', name: '"The Legend"', kind: 'title', rarity: 'epic', icon: 'Award' },
  { id: 'title-lucky', name: '"Lucky One"', kind: 'title', rarity: 'rare', icon: 'Clover' },
  { id: 'lootbox-1', name: 'Mystery Box', kind: 'lootbox', rarity: 'rare', icon: 'Package' },
  { id: 'lootbox-2', name: 'Elite Crate', kind: 'lootbox', rarity: 'epic', icon: 'Box' },
];

export const usePlayerProfile = create<PlayerProfile>((set, get) => ({
  username: 'Player',
  playerId: 'GP-000000',
  avatarSeed: 'player',
  level: 24,
  xp: 3820,
  xpToNext: 6000,
  coins: 100_000,
  dailyStreak: 4,
  dailyClaimedToday: false,
  seasonTier: 37,
  seasonName: 'Season 3 · Neon Rush',
  achievements: ACHIEVEMENTS,
  inventory: INVENTORY,

  country: '🇮🇳',
  status: 'Online',
  favoriteGame: 'Crash',
  clan: { name: 'Neon Syndicate', tag: 'NEON' },
  playMinutes: 4820,
  joinedDays: 128,
  equippedFrame: 'frame-gold',
  equippedTheme: 'theme-neon',
  equippedTitle: 'title-crash-king',
  equippedBanner: 'banner-neon',
  owned: [
    ...ALL_COSMETICS.filter((c) => c.starter).map((c) => c.id),
    'frame-silver', 'frame-gold', 'frame-diamond', 'theme-cyberpunk', 'theme-casino',
    'title-crash-king', 'title-lucky', 'banner-neon', 'banner-gold', 'particle-sparks', 'dice-neon',
  ],
  avatar: { ...DEFAULT_AVATAR },

  setUsername: (name) => {
    const clean = name.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'Player';
    let h = 0;
    for (const c of clean) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    set({
      username: clean.charAt(0).toUpperCase() + clean.slice(1),
      avatarSeed: clean.toLowerCase(),
      playerId: `GP-${(100000 + (h % 900000)).toString()}`,
    });
  },

  addXp: (amount) => {
    let { xp, xpToNext, level } = get();
    xp += Math.max(0, amount);
    while (xp >= xpToNext) {
      xp -= xpToNext;
      level += 1;
      xpToNext = Math.round(xpToNext * 1.15);
    }
    set({ xp, xpToNext, level });
  },

  claimDaily: () => {
    if (get().dailyClaimedToday) return 0;
    const reward = 5000 + get().dailyStreak * 1000;
    set((s) => ({ dailyClaimedToday: true, dailyStreak: s.dailyStreak + 1, coins: s.coins + reward }));
    return reward;
  },

  unlock: (id) =>
    set((s) => ({ achievements: s.achievements.map((a) => (a.id === id ? { ...a, unlocked: true } : a)) })),

  equip: (id) =>
    set((s) => {
      const target = s.inventory.find((i) => i.id === id);
      if (!target) return s;
      return {
        inventory: s.inventory.map((i) =>
          i.kind === target.kind ? { ...i, equipped: i.id === id } : i,
        ),
      };
    }),

  isOwned: (id) => get().owned.includes(id),

  buy: (id) => {
    if (get().owned.includes(id)) return true;
    const item = cosmeticById(id);
    if (!item) return false;
    const wallet = useDemoWallet.getState();
    if (wallet.balance < item.price) return false;
    wallet.spend(item.price);
    set((s) => ({ owned: [...s.owned, id] }));
    return true;
  },

  equipCosmetic: (category, id) => {
    if (!get().owned.includes(id)) return;
    const key =
      category === 'frame'
        ? 'equippedFrame'
        : category === 'theme'
          ? 'equippedTheme'
          : category === 'title'
            ? 'equippedTitle'
            : category === 'banner'
              ? 'equippedBanner'
              : null;
    if (key) set({ [key]: id } as Partial<PlayerProfile>);
  },

  setAvatar: (patch) => set((s) => ({ avatar: { ...s.avatar, ...patch } })),

  setStatus: (status) => set({ status: status.slice(0, 40) || 'Online' }),

  completion: () => {
    const s = get();
    const ach = s.achievements.filter((a) => a.unlocked).length / Math.max(1, s.achievements.length);
    const cos = s.owned.length / Math.max(1, ALL_COSMETICS.length);
    const lvl = Math.min(1, s.level / 50);
    return Math.round((ach * 0.4 + cos * 0.35 + lvl * 0.25) * 100);
  },
}));
