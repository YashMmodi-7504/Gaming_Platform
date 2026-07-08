import { sound } from '@/lib/sound';
import { useDemoWallet } from '@/stores/demo-wallet';
import { useGameStats } from '@/stores/game-stats';
import { usePlayerProfile } from '@/stores/player-profile';

/**
 * One-call game integration: credits winnings to the demo wallet, awards XP,
 * records stats + advances missions, and plays a result sound. Every prototype
 * game calls this after a round so wallet / XP / stats / missions all update
 * consistently. The bet stake is assumed already deducted (via wallet.spend).
 */
export interface SettleInput {
  game: string;
  /** Stake wagered this round (already spent). */
  stake: number;
  win: boolean;
  /** Total-return multiplier on a win (e.g. 2 for even money, 0 on loss). */
  multiplier?: number;
  /** Explicit winnings to credit; overrides multiplier when provided. */
  winnings?: number;
  /** Short history label, e.g. "Blackjack!", "Banker 8", "2048". */
  label: string;
  /** Numeric result for highest/streak stats. */
  value?: number;
  /** Optional XP override; defaults scale with the win. */
  xp?: number;
  /** Play the reward/lose SFX (default true). */
  silent?: boolean;
}

export interface SettleResult {
  winnings: number;
  net: number;
}

export function settleRound(input: SettleInput): SettleResult {
  const { game, stake, win, multiplier = 0, winnings, label, value, xp, silent } = input;
  const wallet = useDemoWallet.getState();

  const paid = win ? Math.max(0, Math.round(winnings ?? stake * multiplier)) : 0;
  if (paid > 0) wallet.credit(paid);

  const net = win ? paid - stake : -stake;

  // Bet-history ledger (Phase 1.3). recordBet ignores 0-stake skill rounds.
  wallet.recordBet({ game, stake, win, net, multiplier: win && stake > 0 ? paid / stake : 0 });

  useGameStats.getState().record(game, {
    label,
    win,
    payout: net,
    value: value ?? (win ? multiplier || 1 : 0),
  });

  usePlayerProfile.getState().addXp(xp ?? (win ? 40 : 12));

  if (!silent) sound.play(win ? 'reward' : 'lose');

  return { winnings: paid, net };
}
