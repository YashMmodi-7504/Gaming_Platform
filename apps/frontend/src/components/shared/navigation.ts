import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Award,
  BarChart3,
  CircleDot,
  Cpu,
  Sparkles,
  Dice5,
  Dices,
  Gamepad2,
  Gem,
  Heart,
  Home,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  Gift,
  Globe,
  Medal,
  Receipt,
  Settings,
  Shield,
  Spade,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

/** Selects which navigation set a layout renders. */
export type NavVariant = 'dashboard' | 'admin';

/** Primary dashboard navigation. */
export const dashboardNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Discover', href: '/discover', icon: Sparkles },
  { label: 'Games', href: '/games', icon: Gamepad2 },
  { label: 'Arcade', href: '/arcade', icon: Cpu },
  { label: 'Casino', href: '/casino', icon: Spade },
  { label: 'Roulette', href: '/roulette', icon: CircleDot },
  { label: 'Dice', href: '/dice', icon: Dice5 },
  { label: 'Crash', href: '/crash', icon: TrendingUp },
  { label: 'Sportsbook', href: '/sportsbook', icon: TrendingUp },
  { label: 'Tournaments', href: '/tournaments', icon: Trophy },
  { label: 'Leaderboards', href: '/leaderboards', icon: Medal },
  { label: 'Promotions', href: '/promotions', icon: Gift },
  { label: 'Rewards', href: '/rewards', icon: Award },
  { label: 'VIP', href: '/vip', icon: Gem },
  { label: 'Favorites', href: '/favorites', icon: Heart },
  { label: 'Wallet', href: '/wallet', icon: Wallet },
  { label: 'Deposit', href: '/deposit', icon: ArrowDownToLine },
  { label: 'Withdraw', href: '/withdraw', icon: ArrowUpFromLine },
  { label: 'Vault', href: '/vault', icon: Lock },
  { label: 'Transactions', href: '/transactions', icon: Receipt },
  { label: 'Bet History', href: '/bets', icon: Dices },
  { label: 'Settings', href: '/settings', icon: Settings },
];

/** Admin console navigation. */
export const adminNav: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: Shield },
  { label: 'Games', href: '/admin/games', icon: Gamepad2 },
  { label: 'Card Engine', href: '/admin/card', icon: Spade },
  { label: 'Roulette', href: '/admin/roulette', icon: CircleDot },
  { label: 'Dice', href: '/admin/dice', icon: Dice5 },
  { label: 'Crash', href: '/admin/crash', icon: TrendingUp },
  { label: 'Sports', href: '/admin/sports', icon: Trophy },
  { label: 'Wallet', href: '/admin/wallet', icon: Wallet },
  { label: 'Tournaments', href: '/admin/tournaments', icon: Trophy },
  { label: 'AI Assistant', href: '/admin/ai', icon: Sparkles },
  { label: 'Operations', href: '/admin/operations', icon: Activity },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

/**
 * Primary "gaming" navigation rendered in the premium top bar (marketing +
 * authenticated app). Every href maps to an existing route.
 */
export const primaryNav: NavItem[] = [
  { label: 'World', href: '/world', icon: Globe },
  { label: 'Home', href: '/', icon: Home },
  { label: 'Casino', href: '/casino', icon: Spade },
  { label: 'Crash', href: '/crash', icon: TrendingUp },
  { label: 'Dice', href: '/dice', icon: Dice5 },
  { label: 'Roulette', href: '/roulette', icon: CircleDot },
  { label: 'Games', href: '/games', icon: Gamepad2 },
  { label: 'Sports', href: '/sportsbook', icon: Activity },
  { label: 'Tournaments', href: '/tournaments', icon: Trophy },
  { label: 'Leaderboard', href: '/leaderboards', icon: Medal },
  { label: 'Promotions', href: '/#promotions', icon: Sparkles },
  { label: 'VIP', href: '/rewards', icon: Gift },
];

/** Public marketing navigation. */
export const marketingNav: { label: string; href: string }[] = [
  { label: 'Games', href: '/games' },
  { label: 'Promotions', href: '/#promotions' },
  { label: 'About', href: '/#about' },
];
