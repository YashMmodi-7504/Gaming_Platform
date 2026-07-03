'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Crown, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PlayingCard } from '@/components/card/playing-card';
import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { createDeck, rankValue, shuffle, suitOf, type Card } from '@/lib/deck';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useDemoWallet } from '@/stores/demo-wallet';
import { useGameStat } from '@/stores/game-stats';

const SLUG = 'teen-patti';
const CHIPS = [100, 500, 1000, 5000];

type Phase = 'idle' | 'dealing' | 'done';

/**
 * Teen Patti (3-card Indian poker) hand ranking, strongest first:
 *   6 Trail (three of a kind) · 5 Pure sequence (straight flush) ·
 *   4 Sequence (straight) · 3 Color (flush) · 2 Pair · 1 High card.
 * A small "hand rank" bonus scales the payout for stronger winning hands.
 */
export const HAND_NAMES = ['High Card', 'Pair', 'Color', 'Sequence', 'Pure Sequence', 'Trail'] as const;
const HAND_BONUS = [0, 0.2, 0.5, 1, 2, 4]; // extra multiplier on top of the even-money base

export interface HandRank {
  /** 1 (high card) … 6 (trail). */
  category: number;
  name: string;
  /** Tiebreaker card values, high → low. */
  tiebreak: number[];
}

/** Straight where A can be high (A-K-Q) or low (A-2-3). */
function isSequence(vals: number[]): boolean {
  const s = [...vals].sort((a, b) => b - a);
  const a = s[0]!;
  const b = s[1]!;
  const c = s[2]!;
  if (a - b === 1 && b - c === 1) return true;
  // A-2-3 wheel: values are 14,3,2
  return a === 14 && b === 3 && c === 2;
}

export function evaluateHand(cards: Card[]): HandRank {
  const vals = cards.map(rankValue).sort((a, b) => b - a);
  const suits = cards.map(suitOf);
  const flush = suits.every((s) => s === suits[0]);
  const seq = isSequence(vals);

  // Wheel A-2-3 ranks as the lowest straight → treat ace as 1 for tiebreak.
  const isWheel = vals[0] === 14 && vals[1] === 3 && vals[2] === 2;
  const seqTiebreak = isWheel ? [3, 2, 1] : vals;

  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  const trail = [...counts.values()].some((n) => n === 3);
  const pairVal = [...counts.entries()].find(([, n]) => n === 2)?.[0];

  if (trail) return { category: 6, name: 'Trail', tiebreak: vals };
  if (seq && flush) return { category: 5, name: 'Pure Sequence', tiebreak: seqTiebreak };
  if (seq) return { category: 4, name: 'Sequence', tiebreak: seqTiebreak };
  if (flush) return { category: 3, name: 'Color', tiebreak: vals };
  if (pairVal !== undefined) {
    const kicker = vals.find((v) => v !== pairVal) ?? 0;
    return { category: 2, name: 'Pair', tiebreak: [pairVal, pairVal, kicker] };
  }
  return { category: 1, name: 'High Card', tiebreak: vals };
}

/** > 0 if a beats b, < 0 if b beats a, 0 on an exact tie. */
export function compareHands(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < a.tiebreak.length; i++) {
    const av = a.tiebreak[i] ?? 0;
    const bv = b.tiebreak[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

interface Deal {
  player: Card[];
  dealer: Card[];
}

function buildDeal(seed: number): Deal {
  const deck = shuffle(createDeck(), seed);
  return {
    player: [deck[0] ?? 'AS', deck[2] ?? 'KS', deck[4] ?? 'QS'],
    dealer: [deck[1] ?? 'AH', deck[3] ?? 'KH', deck[5] ?? 'QH'],
  };
}

export function TeenPattiGame() {
  const balance = useDemoWallet((s) => s.balance);
  const stat = useGameStat(SLUG);

  const [phase, setPhase] = useState<Phase>('idle');
  const [bet, setBet] = useState(100);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<{
    win: boolean;
    net: number;
    playerRank: HandRank;
    dealerRank: HandRank;
    cmp: number;
  } | null>(null);
  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const seedRef = useRef(1);
  const timers = useRef<number[]>([]);
  const fxKeyRef = useRef(0);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const settle = useCallback(
    (d: Deal, stake: number) => {
      const playerRank = evaluateHand(d.player);
      const dealerRank = evaluateHand(d.dealer);
      const cmp = compareHands(playerRank, dealerRank);
      const win = cmp > 0; // ties (rare) go to the dealer, house edge
      const bonus = win ? (HAND_BONUS[playerRank.category - 1] ?? 0) : 0;
      const multiplier = win ? 2 + bonus : 0;

      const { net } = settleRound({
        game: SLUG,
        stake,
        win,
        multiplier,
        label: win ? `Win · ${playerRank.name}` : cmp === 0 ? 'Tie→dealer' : `Lost · ${dealerRank.name}`,
        value: playerRank.category,
      });

      setResult({ win, net, playerRank, dealerRank, cmp });
      setPhase('done');
      if (win) {
        fxKeyRef.current += 1;
        setFx({ key: fxKeyRef.current, type: 'win', amount: net });
        toast.success(`${playerRank.name}! +${net.toLocaleString()}`);
      } else {
        toast.error(cmp === 0 ? 'Tie — dealer edge.' : `Dealer's ${dealerRank.name} wins.`);
      }
    },
    [],
  );

  const play = useCallback(
    (replaySeed?: number) => {
      if (phase === 'dealing') return;
      const stake = Math.max(1, Math.floor(bet));
      if (stake > balance) {
        toast.error('Not enough demo coins — hit reload in the balance pill.');
        return;
      }
      const seed =
        replaySeed ?? (Math.floor((performance.now() * 1000) % 2 ** 31) ^ (stat.seq * 2654435761)) >>> 0;
      seedRef.current = seed >>> 0;
      const d = buildDeal(seedRef.current);

      useDemoWallet.getState().spend(stake);
      clearTimers();
      setDeal(d);
      setResult(null);
      setRevealed(false);
      setPhase('dealing');
      sound.play('cardFlip');
      timers.current.push(window.setTimeout(() => sound.play('cardFlip'), 220));
      timers.current.push(window.setTimeout(() => sound.play('cardFlip'), 440));

      timers.current.push(
        window.setTimeout(() => {
          setRevealed(true);
          sound.play('cardFlip');
        }, 700),
      );
      timers.current.push(
        window.setTimeout(() => {
          settle(d, stake);
        }, 1250),
      );
    },
    [phase, bet, balance, stat.seq, settle],
  );

  const dealing = phase === 'dealing';

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Stage */}
      <div className="card-premium relative aspect-[16/10] overflow-hidden p-0">
        <GameFx trigger={fx} />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-white to-emerald-50" />
        <div className="bg-grid absolute inset-0 opacity-40" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 p-6">
          <HandRow
            label="Dealer"
            cards={deal?.dealer}
            faceDown={!revealed}
            rank={result?.dealerRank}
            winner={phase === 'done' && result ? result.cmp < 0 : false}
          />

          <div className="flex items-center gap-2">
            <span className="h-px w-10 bg-emerald-300/60" />
            <span className="font-display text-xs font-bold uppercase tracking-widest text-emerald-700/50">
              vs
            </span>
            <span className="h-px w-10 bg-emerald-300/60" />
          </div>

          <HandRow
            label="You"
            cards={deal?.player}
            faceDown={!revealed}
            rank={result?.playerRank}
            winner={phase === 'done' && result ? result.cmp > 0 : false}
          />

          {phase === 'idle' && !deal ? (
            <div className="text-center">
              <Crown className="mx-auto mb-1 h-8 w-8 animate-float text-gold" />
              <p className="font-display text-base font-bold text-foreground">Ante up & deal 3 cards</p>
              <p className="text-sm text-muted-foreground">Best Teen Patti hand wins</p>
            </div>
          ) : phase === 'done' && result ? (
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-sm font-bold shadow',
                result.win ? 'bg-emerald/15 text-emerald' : 'bg-destructive/15 text-destructive',
              )}
            >
              {result.win ? <Trophy className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {result.win
                ? `${result.playerRank.name} · +${result.net.toLocaleString()}`
                : `Lost ${result.net.toLocaleString()}`}
            </motion.div>
          ) : (
            <p className="font-display text-sm font-semibold text-emerald-700/70">
              {dealing ? 'Dealing…' : 'Ready'}
            </p>
          )}
        </div>

        <div className="absolute left-3 top-3 z-10 flex gap-1">
          {stat.history.slice(0, 6).map((r) => (
            <span
              key={r.id}
              className={cn(
                'rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold',
                r.win ? 'bg-emerald/15 text-emerald' : 'bg-destructive/15 text-destructive',
              )}
            >
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Controls + stats */}
      <div className="space-y-4">
        <div className="card-premium space-y-3 p-4">
          <label className="block text-xs font-semibold text-muted-foreground">
            Ante (bet)
            <div className="mt-1 flex items-center rounded-xl border border-black/10 bg-white/70 px-2">
              <input
                type="number"
                min={1}
                value={bet}
                onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value))))}
                disabled={dealing}
                className="h-10 w-full bg-transparent font-mono text-sm outline-none"
              />
              <button
                onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
                disabled={dealing}
                className="px-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ½
              </button>
              <button
                onClick={() => setBet((b) => b * 2)}
                disabled={dealing}
                className="px-1 text-xs text-muted-foreground hover:text-foreground"
              >
                2×
              </button>
            </div>
          </label>

          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((v) => (
              <button
                key={v}
                onClick={() => setBet(v)}
                disabled={dealing}
                className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-60"
              >
                {v.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="gradient"
              size="lg"
              className="w-full sheen"
              disabled={dealing}
              onClick={() => play()}
            >
              <Sparkles className="h-5 w-5" /> Deal · {bet.toLocaleString()}
            </Button>
            {phase === 'done' ? (
              <Button variant="glass" size="lg" onClick={() => play(seedRef.current)} title="Replay same deal">
                <RotateCcw className="h-5 w-5" />
              </Button>
            ) : null}
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Even money + rank bonus: Pair 2.2× · Color 2.5× · Seq 3× · Pure 4× · Trail 6×
          </p>

          <div className="text-center text-xs text-muted-foreground">
            Balance{' '}
            <AnimatedNumber value={balance} className="font-mono font-bold tabular-nums text-foreground" />
          </div>
        </div>

        <div className="card-premium grid grid-cols-2 gap-3 p-4 text-center">
          <Stat label="Best hand" value={HAND_NAMES[Math.max(0, Math.min(5, stat.highest - 1))] ?? '—'} />
          <Stat label="Best streak" value={String(stat.bestStreak)} />
          <Stat label="Rounds" value={String(stat.rounds)} />
          <Stat label="Biggest win" value={`+${stat.biggestWin.toLocaleString()}`} />
        </div>

        <div className="card-premium p-4">
          <p className="mb-2 font-display text-sm font-bold">History</p>
          <div className="flex flex-wrap gap-1.5">
            {stat.history.slice(0, 14).map((r) => (
              <span
                key={r.id}
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold',
                  r.win ? 'bg-emerald/15 text-emerald' : 'bg-destructive/15 text-destructive',
                )}
              >
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HandRow({
  label,
  cards,
  faceDown,
  rank,
  winner,
}: {
  label: string;
  cards?: Card[];
  faceDown?: boolean;
  rank?: HandRank;
  winner?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex w-full max-w-sm items-center justify-between gap-3 rounded-2xl border-2 p-2.5 transition-colors sm:max-w-md lg:max-w-lg',
        winner ? 'border-gold bg-gold/10 shadow-glow' : 'border-transparent',
      )}
    >
      <div className="flex flex-col items-start gap-0.5">
        <span className="font-display text-xs font-bold uppercase tracking-widest text-emerald-700/70">
          {label}
        </span>
        {rank ? (
          <Badge variant={winner ? 'featured' : 'secondary'} className="text-[10px]">
            {rank.name}
          </Badge>
        ) : (
          <span className="h-5" />
        )}
      </div>
      <div className="flex gap-1.5">
        {(cards ?? [undefined, undefined, undefined]).map((c, i) => (
          <PlayingCard key={`${label}-${i}`} code={c} faceDown={faceDown} index={i} small />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] p-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
