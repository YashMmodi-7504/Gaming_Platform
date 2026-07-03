'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, RotateCcw, Sparkles, Timer, Trophy, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useGameStat } from '@/stores/game-stats';

const EMOJIS = ['🚀', '🎲', '💎', '🔥', '⭐', '🎯', '🍀', '⚡'];
const GRADIENTS = [
  'from-primary to-violet',
  'from-pink to-rose-500',
  'from-emerald to-teal-500',
  'from-gold to-amber-500',
  'from-cyan-400 to-blue-500',
  'from-violet to-purple-500',
  'from-orange-400 to-pink-500',
  'from-lime-400 to-emerald-500',
];

interface Card {
  id: number;
  pairId: number;
  emoji: string;
  gradient: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function buildDeck(): Card[] {
  const pairs = EMOJIS.map((emoji, i) => ({ emoji, gradient: GRADIENTS[i % GRADIENTS.length]! , pairId: i }));
  const doubled = shuffle([...pairs, ...pairs]);
  return doubled.map((p, i) => ({
    id: i,
    pairId: p.pairId,
    emoji: p.emoji,
    gradient: p.gradient,
    flipped: false,
    matched: false,
  }));
}

const TOTAL_PAIRS = EMOJIS.length;

export function MemoryGame() {
  const stat = useGameStat('memory');
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [lock, setLock] = useState(false);
  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const fxKey = useRef(0);
  const timerRef = useRef<number | null>(null);
  const startTsRef = useRef(0);
  const flipTimeoutRef = useRef<number | null>(null);
  const settledRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (flipTimeoutRef.current !== null) {
      window.clearTimeout(flipTimeoutRef.current);
      flipTimeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setCards(buildDeck());
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setElapsed(0);
    setStarted(false);
    setDone(false);
    setLock(false);
    settledRef.current = false;
  }, [clearTimers]);

  useEffect(() => {
    reset();
    return clearTimers;
  }, [reset, clearTimers]);

  const startTimer = useCallback(() => {
    if (timerRef.current !== null) return;
    startTsRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsed((Date.now() - startTsRef.current) / 1000);
    }, 100);
  }, []);

  const finish = useCallback(
    (finalMoves: number, seconds: number) => {
      if (settledRef.current) return;
      settledRef.current = true;
      clearTimers();
      // Fewer moves + faster = more coins. Perfect = TOTAL_PAIRS moves.
      const movePenalty = Math.max(0, finalMoves - TOTAL_PAIRS) * 40;
      const timePenalty = Math.round(seconds) * 15;
      const coins = Math.max(150, 2200 - movePenalty - timePenalty);
      const score = coins;
      const xp = Math.max(20, 90 - Math.max(0, finalMoves - TOTAL_PAIRS) * 3);
      settleRound({
        game: 'memory',
        stake: 0,
        win: true,
        winnings: coins,
        label: `Memory · ${finalMoves} moves`,
        value: score,
        xp,
      });
      fxKey.current += 1;
      setFx({ key: fxKey.current, type: 'win', amount: coins });
      sound.play('achievement');
      toast.success(`Cleared in ${finalMoves} moves · ${seconds.toFixed(1)}s`, {
        description: `+${coins.toLocaleString('en-US')} coins · +${xp} XP`,
      });
    },
    [clearTimers],
  );

  const flip = useCallback(
    (id: number) => {
      if (lock || done) return;
      if (!started) {
        setStarted(true);
        startTimer();
      }
      setCards((cur) => {
        const card = cur.find((c) => c.id === id);
        if (!card || card.flipped || card.matched) return cur;
        if (flipped.length >= 2) return cur;
        sound.play('cardFlip');
        return cur.map((c) => (c.id === id ? { ...c, flipped: true } : c));
      });
      setFlipped((f) => {
        const card = cards.find((c) => c.id === id);
        if (!card || card.matched || f.includes(id) || f.length >= 2) return f;
        return [...f, id];
      });
    },
    [lock, done, started, startTimer, flipped.length, cards],
  );

  // resolve a pair when two are flipped
  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    const cardA = cards.find((c) => c.id === a);
    const cardB = cards.find((c) => c.id === b);
    if (!cardA || !cardB) return;
    setMoves((m) => m + 1);
    setLock(true);

    if (cardA.pairId === cardB.pairId) {
      sound.play('coin');
      setCards((cur) => cur.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c)));
      setMatches((m) => m + 1);
      setFlipped([]);
      setLock(false);
    } else {
      flipTimeoutRef.current = window.setTimeout(() => {
        setCards((cur) => cur.map((c) => (c.id === a || c.id === b ? { ...c, flipped: false } : c)));
        setFlipped([]);
        setLock(false);
      }, 780);
    }
  }, [flipped, cards]);

  // win detection
  useEffect(() => {
    if (matches === TOTAL_PAIRS && matches > 0 && !done) {
      setDone(true);
      finish(moves, (Date.now() - startTsRef.current) / 1000);
    }
  }, [matches, done, moves, finish]);

  const bestMoves = useMemo(() => {
    // higher stat.value = more coins = fewer moves; keep a readable "best score"
    return stat.highest;
  }, [stat.highest]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="card-premium relative overflow-hidden p-4 sm:p-6">
        <GameFx trigger={fx} />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-lg font-bold text-gradient">Memory Match</p>
            <p className="text-xs text-muted-foreground">Flip two cards · find all pairs</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-black/[0.04] px-3 py-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-display text-lg font-bold tabular-nums">{moves}</span>
              <span className="text-[10px] uppercase text-muted-foreground">moves</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-black/[0.04] px-3 py-1.5">
              <Timer className="h-4 w-4 text-accent" />
              <span className="font-display text-lg font-bold tabular-nums">{elapsed.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        <div className="relative mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-3">
          {cards.map((card) => {
            const faceUp = card.flipped || card.matched;
            return (
              <button
                key={card.id}
                onClick={() => flip(card.id)}
                disabled={faceUp || lock}
                className="relative aspect-square [perspective:800px]"
                aria-label={faceUp ? card.emoji : 'hidden card'}
              >
                <motion.div
                  className="relative h-full w-full [transform-style:preserve-3d]"
                  animate={{ rotateY: faceUp ? 180 : 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* back */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 shadow-sm ring-1 ring-black/5 [backface-visibility:hidden]">
                    <span className="text-2xl opacity-40">?</span>
                  </div>
                  {/* front */}
                  <div
                    className={cn(
                      'absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br text-3xl shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] sm:text-4xl',
                      card.gradient,
                      card.matched && 'ring-2 ring-emerald shadow-glow',
                    )}
                  >
                    <motion.span animate={card.matched ? { scale: [1, 1.25, 1] } : {}} transition={{ duration: 0.4 }}>
                      {card.emoji}
                    </motion.span>
                  </div>
                </motion.div>
              </button>
            );
          })}

          <AnimatePresence>
            {done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/75 backdrop-blur-sm"
              >
                <Trophy className="h-10 w-10 text-gold" />
                <p className="font-display text-2xl font-bold text-gradient-gold">Solved!</p>
                <p className="font-mono text-sm text-muted-foreground">
                  {moves} moves · {elapsed.toFixed(1)}s
                </p>
                <Button variant="gradient" size="lg" className="sheen" onClick={reset}>
                  <RotateCcw className="h-5 w-5" /> Play Again
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card-premium space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-bold">Objective</p>
            <Badge variant="secondary">{TOTAL_PAIRS} pairs</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Flip two cards at a time to reveal them. Match all {TOTAL_PAIRS} pairs. Fewer moves and faster
            times earn more coins and XP.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-emerald/10 px-3 py-2">
            <Clock className="h-4 w-4 text-emerald" />
            <span className="text-sm font-semibold text-emerald">
              {matches}/{TOTAL_PAIRS} matched
            </span>
          </div>
          <Button variant="glass" size="lg" className="w-full" onClick={reset}>
            <RotateCcw className="h-5 w-5" /> Restart
          </Button>
        </div>

        <div className="card-premium grid grid-cols-2 gap-3 p-4 text-center">
          <StatCell icon={<Trophy className="h-4 w-4 text-gold" />} label="Best score" value={bestMoves.toLocaleString('en-US')} />
          <StatCell icon={<Zap className="h-4 w-4 text-emerald" />} label="Rounds" value={String(stat.rounds)} />
          <StatCell label="Biggest win" value={`+${stat.biggestWin.toLocaleString('en-US')}`} />
          <StatCell label="Best streak" value={String(stat.bestStreak)} />
        </div>

        <div className="card-premium p-4">
          <p className="mb-2 font-display text-sm font-bold">Recent games</p>
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

function StatCell({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] p-2">
      <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
