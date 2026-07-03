'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Play, RotateCcw, Timer, Trophy, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useGameStat } from '@/stores/game-stats';

interface Swatch {
  name: string;
  className: string;
  text: string;
}

const COLORS: Swatch[] = [
  { name: 'Red', className: 'from-rose-400 to-red-500', text: 'text-red-500' },
  { name: 'Blue', className: 'from-sky-400 to-blue-500', text: 'text-blue-500' },
  { name: 'Green', className: 'from-emerald-400 to-green-500', text: 'text-emerald-500' },
  { name: 'Gold', className: 'from-amber-300 to-yellow-500', text: 'text-amber-500' },
  { name: 'Violet', className: 'from-violet-400 to-purple-500', text: 'text-violet-500' },
  { name: 'Pink', className: 'from-pink-400 to-fuchsia-500', text: 'text-pink-500' },
];

const START_TIME = 3000; // ms per round
const MIN_TIME = 900;
const SPEEDUP = 90; // ms shaved per correct answer

type Phase = 'idle' | 'playing' | 'over';

interface Round {
  wordIndex: number; // which color name is shown
  inkIndex: number; // color the word is printed in (Stroop)
  options: number[]; // indices into COLORS
  answer: number; // index into COLORS the player must pick (the INK color)
}


function buildRound(): Round {
  const inkIndex = Math.floor(Math.random() * COLORS.length);
  // 50% Stroop: word text differs from ink color
  let wordIndex = inkIndex;
  if (Math.random() < 0.5) {
    do {
      wordIndex = Math.floor(Math.random() * COLORS.length);
    } while (wordIndex === inkIndex);
  }
  // options: answer (ink) + 3 distractors
  const opts = new Set<number>([inkIndex]);
  while (opts.size < 4) {
    opts.add(Math.floor(Math.random() * COLORS.length));
  }
  const options = [...opts];
  // shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = options[i]!;
    options[i] = options[j]!;
    options[j] = tmp;
  }
  return { wordIndex, inkIndex, options, answer: inkIndex };
}

export function ColorMatchGame() {
  const stat = useGameStat('color-match');
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState<Round | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(START_TIME);
  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const rafRef = useRef<number | null>(null);
  const roundEndRef = useRef(0);
  const roundDurRef = useRef(START_TIME);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const answeredRef = useRef(false);
  const fxKey = useRef(0);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => stopRaf, [stopRaf]);

  const endGame = useCallback(() => {
    stopRaf();
    setPhase('over');
    const finalScore = scoreRef.current;
    const win = finalScore >= 5;
    const coins = Math.max(80, finalScore * 130 + bestComboRef.current * 40);
    const xp = Math.max(10, finalScore * 5);
    settleRound({
      game: 'color-match',
      stake: 0,
      win,
      winnings: win ? coins : 0,
      label: `Color Match · ${finalScore} pts`,
      value: finalScore,
      xp,
    });
    if (win) {
      fxKey.current += 1;
      setFx({ key: fxKey.current, type: 'win', amount: coins });
      toast.success(`Score ${finalScore} · best combo ${bestComboRef.current}`, {
        description: `+${coins.toLocaleString('en-US')} coins · +${xp} XP`,
      });
    } else {
      toast(`Game over — score ${finalScore}`);
    }
  }, [stopRaf]);

  const nextRound = useCallback(() => {
    answeredRef.current = false;
    const dur = Math.max(MIN_TIME, START_TIME - scoreRef.current * SPEEDUP);
    roundDurRef.current = dur;
    roundEndRef.current = performance.now() + dur;
    setRound(buildRound());
    setTimeLeft(dur);

    const loop = () => {
      const remaining = roundEndRef.current - performance.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        if (!answeredRef.current) {
          answeredRef.current = true;
          sound.play('lose');
          endGame();
        }
        return;
      }
      setTimeLeft(remaining);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [endGame]);

  const start = useCallback(() => {
    stopRaf();
    scoreRef.current = 0;
    comboRef.current = 0;
    bestComboRef.current = 0;
    answeredRef.current = false;
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setPhase('playing');
    nextRound();
  }, [stopRaf, nextRound]);

  const answer = useCallback(
    (choice: number) => {
      if (phase !== 'playing' || answeredRef.current || !round) return;
      if (choice === round.answer) {
        answeredRef.current = true;
        stopRaf();
        sound.play('coin');
        scoreRef.current += 1;
        comboRef.current += 1;
        bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
        setScore(scoreRef.current);
        setCombo(comboRef.current);
        setBestCombo(bestComboRef.current);
        nextRound();
      } else {
        answeredRef.current = true;
        sound.play('lose');
        comboRef.current = 0;
        setCombo(0);
        endGame();
      }
    },
    [phase, round, stopRaf, nextRound, endGame],
  );

  const timePct = Math.max(0, Math.min(1, timeLeft / roundDurRef.current));
  const timerColor = timePct > 0.5 ? 'bg-emerald' : timePct > 0.25 ? 'bg-gold' : 'bg-destructive';

  const wordColor = round ? COLORS[round.wordIndex] : null;
  const inkColor = round ? COLORS[round.inkIndex] : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="card-premium relative overflow-hidden p-4 sm:p-6">
        <GameFx trigger={fx} />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-lg font-bold text-gradient">Color Match</p>
            <p className="text-xs text-muted-foreground">Tap the swatch matching the ink color</p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-xl bg-black/[0.04] px-3 py-1.5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</p>
              <p className="font-display text-xl font-bold tabular-nums text-primary">
                <AnimatedNumber value={score} duration={300} />
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-gold/10 px-3 py-1.5">
              <Flame className={cn('h-4 w-4', combo >= 3 ? 'text-orange-500' : 'text-gold')} />
              <span className="font-display text-xl font-bold tabular-nums text-gold">{combo}</span>
            </div>
          </div>
        </div>

        {/* timer bar */}
        <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
          <motion.div className={cn('h-full rounded-full', timerColor)} style={{ width: `${timePct * 100}%` }} />
        </div>

        {/* prompt */}
        <div className="relative flex aspect-[16/9] w-full flex-col items-center justify-center gap-6 rounded-2xl bg-gradient-to-br from-white to-primary/5 shadow-inner">
          <div className="bg-grid absolute inset-0 rounded-2xl opacity-30" />

          <AnimatePresence mode="wait">
            {phase === 'playing' && round && wordColor && inkColor ? (
              <motion.div
                key={`${round.wordIndex}-${round.inkIndex}-${score}`}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="z-10 text-center"
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Tap this ink color</p>
                <p className={cn('font-display text-5xl font-bold sm:text-7xl', inkColor.text)}>
                  {wordColor.name}
                </p>
              </motion.div>
            ) : phase === 'idle' ? (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="z-10 text-center">
                <Zap className="mx-auto mb-2 h-10 w-10 animate-float text-primary" />
                <p className="font-display text-2xl font-bold">Ready?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Match the <span className="font-semibold">ink color</span> — not the word. Speeds up each round.
                </p>
              </motion.div>
            ) : (
              <motion.div key="over" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="z-10 text-center">
                <Trophy className="mx-auto mb-2 h-10 w-10 text-gold" />
                <p className="font-display text-3xl font-bold text-gradient-gold">Game Over</p>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  Score {score} · best combo {bestCombo}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* swatches */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {phase === 'playing' && round
            ? round.options.map((ci, i) => {
                const c = COLORS[ci];
                if (!c) return null;
                return (
                  <motion.button
                    key={`${ci}-${i}`}
                    onClick={() => answer(ci)}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.04 }}
                    className={cn(
                      'flex h-16 items-center justify-center rounded-xl bg-gradient-to-br font-display text-sm font-bold text-white shadow-md ring-1 ring-black/5 sm:h-20',
                      c.className,
                    )}
                  >
                    {c.name}
                  </motion.button>
                );
              })
            : COLORS.slice(0, 4).map((c) => (
                <div key={c.name} className={cn('flex h-16 items-center justify-center rounded-xl bg-gradient-to-br opacity-40 sm:h-20', c.className)} />
              ))}
        </div>

        {/* controls */}
        <div className="mt-4 flex gap-2">
          {phase === 'playing' ? (
            <Button variant="glass" size="lg" className="w-full" onClick={endGame}>
              End round
            </Button>
          ) : (
            <Button variant="gradient" size="lg" className="w-full sheen" onClick={start}>
              {phase === 'over' ? <><RotateCcw className="h-5 w-5" /> Play Again</> : <><Play className="h-5 w-5" /> Start</>}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card-premium space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-bold">Rules</p>
            <Badge variant="secondary">Stroop</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            A color word appears, printed in a possibly different ink color. Tap the swatch that matches the
            <span className="font-semibold"> ink color</span>, before the timer empties. Each correct answer speeds
            up the next round. One miss or timeout ends the game.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-black/[0.03] px-3 py-2">
            <Timer className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">Best combo this run:</span>
            <span className="ml-auto font-display font-bold text-gold">{bestCombo}</span>
          </div>
        </div>

        <div className="card-premium grid grid-cols-2 gap-3 p-4 text-center">
          <StatCell icon={<Trophy className="h-4 w-4 text-gold" />} label="Best score" value={Math.max(stat.highest, score).toLocaleString('en-US')} />
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
