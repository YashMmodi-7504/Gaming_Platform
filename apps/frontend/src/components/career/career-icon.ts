import {
  CalendarDays,
  CircleDot,
  Club,
  Coins,
  Crown,
  Dice5,
  Flame,
  Gamepad2,
  Gem,
  type LucideIcon,
  Rocket,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  Rocket,
  Club,
  CircleDot,
  Dice5,
  Coins,
  Timer,
  Gamepad2,
  CalendarDays,
  Zap,
  Sparkles,
  Trophy,
  TrendingUp,
  Crown,
  Flame,
  Gem,
};

/** Resolve a lucide icon name used by career records/journey to a component. */
export function careerIcon(name: string): LucideIcon {
  return MAP[name] ?? Sparkles;
}
