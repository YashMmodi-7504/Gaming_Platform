import {
  CircleDot,
  Club,
  Dice5,
  Gem,
  type LucideIcon,
  Palette,
  PartyPopper,
  Rocket,
  Sparkles,
  Store,
  Trophy,
  Zap,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  Sparkles,
  Zap,
  Rocket,
  CircleDot,
  Club,
  PartyPopper,
  Dice5,
  Gem,
  Palette,
  Store,
  Trophy,
};

/** Resolve a lucide icon name (from the event catalog) to a component. */
export function eventIcon(name: string): LucideIcon {
  return MAP[name] ?? Sparkles;
}
