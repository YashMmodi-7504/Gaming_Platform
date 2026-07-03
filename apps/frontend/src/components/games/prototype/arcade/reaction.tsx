'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Gauge, RotateCcw, Timer, Trophy, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useGameStat } from '@/stores/game-stats';

type Phase = 'idle' | 'waiting' | 'ready' | 'result' | 'fault';

const ATTEMPTS = 5;

/** Coins scale inversely with reaction ms (fast = more). */
function coinsFor(ms: number): number {
  const c = Math.round(2000 - (ms - 120) * 4);
  return Math.max(120, Math.min(2400, c));
}

export function ReactionGame() {
  const stat = useGameStat('reaction');
  const [phase, setPhase] = useState<Phase>('idle');
  const [ms, setMs] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<number[]>([]);
  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const timeoutRef = useRef<number | null>(null);
  const greenTsRef = useRef(0);
  const fxKey = useRef(0);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const arm = useCallback(() => {
    clearTimer();
    setPhase('waiting');
    setMs(null);
    const delay = 1200 + Math.random() * 2800;
    timeoutRef.current = window.setTimeout(() => {
      greenTsRef.current = performance.now();
      setPhase('ready');
      sound.play('notify');
    }, delay);
  }, [clearTimer]);

  const settleAttempt = useCallback(
    (reaction: number, nextAttempts: number[]) => {
      const coins = coinsFor(reaction);
      const win = reaction <= 400;
      const xp = Math.max(8, Math.round((600 - Math.min(600, reaction)) / 8));
      settleRound({
        game: 'reaction',
        stake: 0,
        win,
        winnings: win ? coins : Math.round(coins * 0.4),
        label: `Reaction · ${reaction}ms`,
        // higher value = better, so store inverse
        value: Math.max(0, 1000 - reaction),
        xp,
      });
      if (win) {
        fxKey.current += 1;
        setFx({ key: fxKey.current, type: 'win', amount: coins });
      }
      const avg = nextAttempts.length
        ? Math.round(nextAttempts.reduce((a, b) => a + b, 0) / nextAttempts.length)
        : reaction;
      const paid = win ? coins : Math.round(coins * 0.4);
      const desc = nextAttempts.length >= ATTEMPTS ? `Avg over ${ATTEMPTS}: ${avg}ms` : `Attempt ${nextAttempts.length}/${ATTEMPTS}`;
      if (win) toast.success(`${reaction}ms · +${paid.toLocaleString('en-US')} coins`, { description: desc });
      else toast.message(`${reaction}ms · +${paid.toLocaleString('en-US')} coins`, { description: desc });
    },
    [],
  );

  const handleTap = useCallback(() => {
    if (phase === 'idle' || phase === 'result' || phase === 'fault') {
      arm();
      return;
    }
    if (phase === 'waiting') {
      // clicked too early
      clearTimer();
      setPhase('fault');
      sound.play('lose');
      toast.error('Too early! Wait for green.');
      return;
    }
    if (phase === 'ready') {
      const reaction = Math.round(performance.now() - greenTsRef.current);
      setMs(reaction);
      setPhase('result');
      sound.play('cashout');
      const next = [...attempts, reaction].slice(-ATTEMPTS);
      setAttempts(next);
      settleAttempt(reaction, next);
    }
  }, [phase, arm, clearTimer, attempts, settleAttempt]);

  const resetAll = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setMs(null);
    setAttempts([]);
  }, [clearTimer]);

  const best = attempts.length ? Math.min(...attempts) : null;
  const avg = attempts.length ? Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length) : null;

  // best ms from stored stats (value = 1000 - ms)
  const storedBestMs = stat.highest > 0 ? 1000 - stat.highest : null;
  const displayBest =
    best !== null && storedBestMs !== null ? Math.min(best, storedBestMs) : (best ?? storedBestMs);

  const stageStyle =
    phase === 'ready'
      ? 'from-emerald-400 to-teal-500 text-white'
      : phase === 'waiting'
        ? 'from-rose-400 to-red-500 text-white'
        : phase === 'fault'
          ? 'from-orange-300 to-rose-400 text-white'
          : 'from-primary/10 to-accent/10 text-foreground';

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="card-premium relative overflow-hidden p-4 sm:p-6">
        <GameFx trigger={fx} />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold text-gradient">Reaction Test</p>
            <p className="text-xs text-muted-foreground">Tap the instant it turns green</p>
          </div>
          <Badge variant="secondary">{attempts.length}/{ATTEMPTS} attempts</Badge>
        </div>

        <motion.button
          onClick={handleTap}
          className={cn(
            'relative flex aspect-[16/10] w-full select-none flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-inner transition-colors',
            stageStyle,
          )}
          whileTap={{ scale: 0.985 }}
        >
          <div className="bg-grid absolute inset-0 opacity-20" />
          <AnimatePresence mode="wait">
            {phase === 'idle' ? (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <Zap className="mx-auto mb-2 h-10 w-10 animate-float text-primary" />
                <p className="font-display text-2xl font-bold">Tap to start</p>
                <p className="mt-1 text-sm text-muted-foreground">Wait for green, then tap fast</p>
              </motion.div>
            ) : phase === 'waiting' ? (
              <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <p className="font-display text-3xl font-bold">Wait…</p>
                <p className="mt-1 text-sm opacity-90">Don&apos;t tap until it&apos;s green</p>
              </motion.div>
            ) : phase === 'ready' ? (
              <motion.div key="ready" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <p className="font-display text-5xl font-bold sm:text-6xl">TAP!</p>
              </motion.div>
            ) : phase === 'fault' ? (
              <motion.div key="fault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <p className="font-display text-3xl font-bold">Too early!</p>
                <p className="mt-1 text-sm opacity-90">Tap to try again</p>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <p className="font-display text-5xl font-bold tabular-nums sm:text-6xl text-gradient">{ms}ms</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {ms !== null && ms <= 250 ? 'Lightning fast!' : ms !== null && ms <= 400 ? 'Nice reflexes' : 'Keep practising'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Tap to go again</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <div className="mt-4 flex gap-2">
          <Button
            variant="gradient"
            size="lg"
            className="flex-1 sheen"
            onClick={() => (phase === 'waiting' || phase === 'ready' ? undefined : arm())}
            disabled={phase === 'waiting' || phase === 'ready'}
          >
            {phase === 'waiting' || phase === 'ready' ? 'In progress…' : 'Start attempt'}
          </Button>
          <Button variant="glass" size="lg" onClick={resetAll}>
            <RotateCcw className="h-5 w-5" /> Reset
          </Button>
        </div>

        {/* attempt chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {attempts.map((a, i) => (
            <span
              key={i}
              className={cn(
                'rounded-md px-2 py-0.5 font-mono text-[11px] font-bold',
                a <= 250 ? 'bg-emerald/15 text-emerald' : a <= 400 ? 'bg-gold/15 text-gold' : 'bg-primary/10 text-primary',
              )}
            >
              {a}ms
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card-premium grid grid-cols-2 gap-3 p-4 text-center">
          <StatCell icon={<Gauge className="h-4 w-4 text-emerald" />} label="Best (this run)" value={best !== null ? `${best}ms` : '—'} />
          <StatCell icon={<Timer className="h-4 w-4 text-accent" />} label="Avg" value={avg !== null ? `${avg}ms` : '—'} />
          <StatCell icon={<Trophy className="h-4 w-4 text-gold" />} label="All-time best" value={displayBest !== null ? `${displayBest}ms` : '—'} />
          <StatCell label="Rounds" value={String(stat.rounds)} />
        </div>

        <div className="card-premium space-y-3 p-4">
          <p className="font-display text-sm font-bold">How it works</p>
          <p className="text-sm text-muted-foreground">
            Start an attempt, wait for the panel to flash <span className="font-semibold text-emerald">green</span>,
            then tap as fast as you can. Tapping too early is a fault. Faster reactions award more coins and XP.
            Run {ATTEMPTS} attempts for an average.
          </p>
          <div className="rounded-xl bg-black/[0.03] p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Biggest win</p>
            <p className="font-display text-lg font-bold text-gold">+{stat.biggestWin.toLocaleString('en-US')}</p>
          </div>
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
