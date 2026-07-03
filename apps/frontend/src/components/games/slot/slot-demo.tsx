'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { ChevronLeft, Coins, Crown, Minus, Plus, RotateCw, Volume2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AnimatedNumber } from '@/components/marketing/animated-number';

/**
 * Premium, presentation-only slot / instant-win demo.
 *
 * Fully client-side — no backend, no `Math.random()` / `Date.now()`. Outcomes
 * come from a seeded PRNG (mulberry32) advanced one step per spin, so the reel
 * strips are stable across SSR/CSR (no hydration drift) and every session is
 * reproducible. Respects reduced-motion. Coins/jackpot are demo-only.
 */

const SYMBOLS = [
  { char: '🍒', pay: 4, label: 'Cherry' },
  { char: '🍋', pay: 5, label: 'Lemon' },
  { char: '🔔', pay: 8, label: 'Bell' },
  { char: '⭐', pay: 12, label: 'Star' },
  { char: '💎', pay: 25, label: 'Diamond' },
  { char: '7️⃣', pay: 50, label: 'Seven' },
] as const;

const ROWS = 3;
const STRIP = 32; // symbols per reel strip
const CELL = 92; // px per symbol cell
const REELS = 3;
const BETS = [5, 10, 25, 50, 100] as const;

function fnv(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG — same seed → same stream. No global RNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable per-reel strip of symbol indices, derived from the slug. */
function buildStrip(slug: string, reel: number): number[] {
  const rnd = mulberry32(fnv(`${slug}::reel::${reel}`));
  return Array.from({ length: STRIP }, () => Math.floor(rnd() * SYMBOLS.length));
}

interface SlotDemoProps {
  slug: string;
  title: string;
  /** Back-nav targets (default to the Games library; casino passes /casino). */
  lobbyHref?: string;
  detailHref?: string;
}

export function SlotDemo({ slug, title, lobbyHref = '/games', detailHref }: SlotDemoProps) {
  const backHref = detailHref ?? `${lobbyHref}/${slug}`;
  const strips = useMemo(() => Array.from({ length: REELS }, (_, r) => buildStrip(slug, r)), [slug]);

  // Start each reel showing a stable window (offset 1 → middle row = strip[1]).
  const [offsets, setOffsets] = useState<number[]>(() => strips.map(() => 1));
  const [spinning, setSpinning] = useState(false);
  const [coins, setCoins] = useState(5000);
  const [betIndex, setBetIndex] = useState(1);
  const [jackpot, setJackpot] = useState(() => 25_000 + (fnv(slug) % 50_000));
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [message, setMessage] = useState('Spin to play — free demo coins');

  const spinCount = useRef(0);
  const reduced = useReducedMotion();
  const bet = BETS[betIndex]!;

  const middleSymbols = offsets.map((o, r) => strips[r]![(o + 1) % STRIP]!);

  const spin = useCallback(() => {
    if (spinning) return;
    if (coins < bet) {
      setMessage('Not enough demo coins — resetting balance');
      setCoins(5000);
      return;
    }
    setSpinning(true);
    setLastWin(null);
    setCoins((c) => c - bet);
    setMessage('Spinning…');

    // Deterministic target per reel from a per-spin seed.
    spinCount.current += 1;
    const rnd = mulberry32(fnv(`${slug}::spin::${spinCount.current}`));
    const targets = strips.map(() => {
      // Land within a safe window so a full 3-row view is always valid.
      return 1 + Math.floor(rnd() * (STRIP - ROWS - 1));
    });

    const settle = () => {
      setOffsets(targets);
      const results = targets.map((o, r) => strips[r]![(o + 1) % STRIP]!);
      const [a, b, c] = results as [number, number, number];
      let win = 0;
      if (a === b && b === c) {
        win = SYMBOLS[a]!.pay * bet;
        if (SYMBOLS[a]!.char === '7️⃣') {
          // Jackpot line.
          win += jackpot;
          setJackpot(25_000 + (fnv(`${slug}${spinCount.current}`) % 50_000));
          setMessage(`🎉 JACKPOT — ${SYMBOLS[a]!.label} × ${REELS}!`);
        } else {
          setMessage(`Win! Three ${SYMBOLS[a]!.label}s`);
        }
      } else if (a === b || b === c || a === c) {
        win = Math.round(bet * 1.5);
        setMessage('Nice — a matching pair');
      } else {
        setMessage('No win — spin again');
      }
      setJackpot((j) => j + Math.round(bet * 0.25));
      if (win > 0) {
        setCoins((prev) => prev + win);
        setLastWin(win);
      }
      setSpinning(false);
    };

    if (reduced) {
      settle();
    } else {
      // Let the CSS reel transition play, then resolve.
      window.setTimeout(settle, 1150);
    }
  }, [bet, coins, jackpot, reduced, slug, spinning, strips]);

  // Space to spin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        spin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spin]);

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-primary/10 via-background to-background">
      {/* Header */}
      <header className="glass-strong flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>
            <ChevronLeft className="h-4 w-4" /> Details
          </Link>
        </Button>
        <span className="flex items-center gap-2 font-display font-semibold">
          <Zap className="h-4 w-4 text-gold" /> {title}
          <Badge variant="secondary">Slot demo</Badge>
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href={lobbyHref}>Lobby</Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 p-4 lg:max-w-4xl">
        {/* Jackpot */}
        <div className="glass-strong flex items-center gap-3 rounded-2xl px-5 py-2.5">
          <Crown className="h-5 w-5 text-gold animate-glow-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Jackpot</span>
          <span className="font-mono text-2xl font-extrabold tabular-nums text-gradient-gold">
            <AnimatedNumber value={jackpot} prefix="$" live />
          </span>
        </div>

        {/* Reels */}
        <div className="relative w-full overflow-hidden rounded-3xl border border-gold/30 bg-black/40 p-4 shadow-glow">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />
          <div
            className="relative mx-auto grid gap-3"
            style={{ gridTemplateColumns: `repeat(${REELS}, 1fr)`, maxWidth: 560 }}
          >
            {strips.map((strip, r) => (
              <div
                key={r}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/10 to-white/[0.03] ring-1 ring-white/10"
                style={{ height: ROWS * CELL }}
                aria-hidden
              >
                <div
                  className="flex flex-col will-change-transform"
                  style={{
                    transform: `translateY(${-offsets[r]! * CELL}px)`,
                    transition: spinning && !reduced
                      ? `transform ${900 + r * 120}ms cubic-bezier(0.16,1,0.3,1)`
                      : 'none',
                  }}
                >
                  {strip.map((s, i) => (
                    <span
                      key={i}
                      className="flex shrink-0 items-center justify-center"
                      style={{ height: CELL, fontSize: 52 }}
                    >
                      {SYMBOLS[s]!.char}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Win line */}
          <div
            className="pointer-events-none absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-gold to-transparent opacity-70"
            style={{ marginTop: 0 }}
          />
          {/* Screen-reader result */}
          <p className="sr-only" role="status" aria-live="polite">
            {spinning
              ? 'Reels spinning'
              : `Result: ${middleSymbols.map((s) => SYMBOLS[s]!.label).join(', ')}. ${message}`}
          </p>
        </div>

        {/* Win / message */}
        <div className="flex min-h-[2.5rem] items-center gap-2 text-center">
          {lastWin != null ? (
            <span className="font-display text-2xl font-extrabold text-gradient-gold text-glow">
              +<AnimatedNumber value={lastWin} /> coins
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">{message}</span>
          )}
        </div>

        {/* Controls */}
        <div className="glass-strong flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-gold" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Balance</p>
              <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                <AnimatedNumber value={coins} />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Bet</span>
            <Button
              variant="glass"
              size="icon"
              aria-label="Decrease bet"
              disabled={betIndex === 0 || spinning}
              onClick={() => setBetIndex((i) => Math.max(0, i - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center font-mono text-lg font-bold tabular-nums">{bet}</span>
            <Button
              variant="glass"
              size="icon"
              aria-label="Increase bet"
              disabled={betIndex === BETS.length - 1 || spinning}
              onClick={() => setBetIndex((i) => Math.min(BETS.length - 1, i + 1))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="gold"
            size="xl"
            className="sheen min-w-[9rem] shadow-glow-gold"
            disabled={spinning}
            onClick={spin}
          >
            <RotateCw className={cn('h-5 w-5', spinning && 'animate-spin')} />
            {spinning ? 'Spinning' : 'Spin'}
          </Button>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Volume2 className="h-3.5 w-3.5" /> Press Space to spin · Demo coins only · 18+
        </p>
      </main>
    </div>
  );
}

/** Minimal reduced-motion hook (matchMedia + the app's `.reduce-motion` class). */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () =>
      setReduced(mq.matches || document.documentElement.classList.contains('reduce-motion'));
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}
