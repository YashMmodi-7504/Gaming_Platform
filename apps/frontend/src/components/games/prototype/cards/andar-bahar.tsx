'use client';

import { Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, Spade, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { PlayingCard } from '@/components/card/playing-card';
import { createDeck, rankOf, shuffle, type Card } from '@/lib/deck';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useDemoWallet } from '@/stores/demo-wallet';
import { useGameStat } from '@/stores/game-stats';

const SLUG = 'andar-bahar';

type BetSide = 'andar' | 'bahar';
// Slight house edge: Andar (first-dealt side) pays a touch less.
const PAYOUT: Record<BetSide, number> = { andar: 1.9, bahar: 2.0 };
const CHIPS = [100, 500, 1000, 5000] as const;

interface Outcome {
  joker: Card;
  andar: Card[];
  bahar: Card[];
  /** Full deal order: alternating starting with Andar. */
  sequence: { side: BetSide; card: Card }[];
  winner: BetSide;
}

function resolve(seed: number): Outcome {
  const deck = shuffle(createDeck(1), seed);
  let i = 0;
  const joker = deck[i] ?? 'AS';
  i += 1;
  const jokerRank = rankOf(joker);

  const andar: Card[] = [];
  const bahar: Card[] = [];
  const sequence: { side: BetSide; card: Card }[] = [];
  let winner: BetSide = 'andar';
  // Andar dealt first, then alternate.
  let side: BetSide = 'andar';

  while (i < deck.length) {
    const card = deck[i]!;
    i += 1;
    if (side === 'andar') andar.push(card);
    else bahar.push(card);
    sequence.push({ side, card });
    if (rankOf(card) === jokerRank) {
      winner = side;
      break;
    }
    side = side === 'andar' ? 'bahar' : 'andar';
  }

  return { joker, andar, bahar, sequence, winner };
}

type Phase = 'idle' | 'dealing' | 'result';

const STEP_MS = 300;

export function AndarBaharGame() {
  const balance = useDemoWallet((s) => s.balance);
  const stat = useGameStat(SLUG);

  const [bet, setBet] = useState(100);
  const [side, setSide] = useState<BetSide>('andar');
  const [phase, setPhase] = useState<Phase>('idle');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [dealt, setDealt] = useState(0);
  const [result, setResult] = useState<{ win: boolean; net: number } | null>(null);
  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const timers = useRef<number[]>([]);
  const seedRef = useRef(1);
  const fxKeyRef = useRef(0);
  const stakeRef = useRef(0);
  const sideRef = useRef<BetSide>('andar');

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const finish = useCallback((o: Outcome) => {
    const s = sideRef.current;
    const stake = stakeRef.current;
    const win = o.winner === s;
    const multiplier = win ? PAYOUT[s] : 0;

    const { net } = settleRound({
      game: SLUG,
      stake,
      win,
      multiplier,
      label: `${o.winner === 'andar' ? 'Andar' : 'Bahar'} ${o.sequence.length}`,
      value: win ? multiplier : 0,
    });

    setResult({ win, net });
    if (win) {
      fxKeyRef.current += 1;
      setFx({ key: fxKeyRef.current, type: 'win', amount: net });
    }
    setPhase('result');
  }, []);

  const run = useCallback(
    (seed: number) => {
      const o = resolve(seed);
      setOutcome(o);
      setResult(null);
      setDealt(0);
      setPhase('dealing');

      const n = o.sequence.length;
      for (let k = 1; k <= n; k += 1) {
        timers.current.push(
          window.setTimeout(() => {
            setDealt(k);
            sound.play('cardFlip');
          }, k * STEP_MS),
        );
      }
      timers.current.push(window.setTimeout(() => finish(o), n * STEP_MS + 400));
    },
    [finish],
  );

  const deal = useCallback(
    (replaySeed?: number) => {
      if (phase === 'dealing') return;
      const stake = Math.max(1, Math.floor(bet));
      if (stake > balance) {
        toast.error('Not enough demo coins — hit reload in the balance pill.');
        return;
      }
      clearTimers();
      const seed =
        replaySeed ?? ((Math.floor(performance.now() * 1000) ^ (stat.seq * 2654435761)) >>> 0);
      seedRef.current = seed >>> 0;
      stakeRef.current = stake;
      sideRef.current = side;

      useDemoWallet.getState().spend(stake);
      sound.play('chips');
      run(seedRef.current);
    },
    [phase, bet, balance, side, stat.seq, run, clearTimers],
  );

  // How many cards revealed on each side, based on the dealt sequence position.
  const shownSeq = outcome ? outcome.sequence.slice(0, dealt) : [];
  const andarShown = shownSeq.filter((s) => s.side === 'andar').map((s) => s.card);
  const baharShown = shownSeq.filter((s) => s.side === 'bahar').map((s) => s.card);
  const winner = phase === 'result' ? outcome?.winner : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Stage */}
      <div className="card-premium relative aspect-[16/10] overflow-hidden p-0">
        <GameFx trigger={fx} />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-white to-emerald-50" />
        <div className="bg-grid absolute inset-0 opacity-30" />

        <div className="relative flex h-full flex-col justify-center gap-3 p-4">
          <div className="absolute left-3 top-3 flex gap-1">
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

          {/* Joker */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Game card
              </span>
              <PlayingCard code={outcome?.joker} faceDown={!outcome} small index={0} />
            </div>
          </div>

          {/* Andar / Bahar rows */}
          <Row
            title="Andar"
            payout={PAYOUT.andar}
            cards={andarShown}
            highlight={winner === 'andar'}
            dim={phase === 'result' && winner !== 'andar'}
            tone="text-primary"
          />
          <Row
            title="Bahar"
            payout={PAYOUT.bahar}
            cards={baharShown}
            highlight={winner === 'bahar'}
            dim={phase === 'result' && winner !== 'bahar'}
            tone="text-accent"
          />

          <div className="min-h-[2rem] text-center">
            <AnimatePresence mode="wait">
              {phase === 'result' && result ? (
                <motion.p
                  key="res"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'font-display text-2xl font-bold',
                    result.win ? 'text-emerald' : 'text-destructive',
                  )}
                >
                  {result.win
                    ? `You won +${result.net.toLocaleString()}`
                    : `${outcome?.winner === 'andar' ? 'Andar' : 'Bahar'} matched · ${result.net.toLocaleString()}`}
                </motion.p>
              ) : phase === 'idle' ? (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-display text-lg font-bold text-foreground"
                >
                  Which side matches the game card first?
                </motion.p>
              ) : (
                <motion.p
                  key="deal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-semibold text-muted-foreground"
                >
                  Dealing…
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Controls + stats */}
      <div className="space-y-4">
        <div className="card-premium space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            {(['andar', 'bahar'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                disabled={phase === 'dealing'}
                className={cn(
                  'rounded-xl border px-2 py-3 text-center transition-all disabled:opacity-60',
                  side === s
                    ? 'border-primary bg-primary/10 shadow-glow'
                    : 'border-black/10 bg-white/60 hover:border-primary/40',
                )}
              >
                <span className="block font-display text-sm font-bold capitalize text-foreground">
                  {s}
                </span>
                <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                  {PAYOUT[s]}×
                </span>
              </button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-muted-foreground">
            Bet amount
            <div className="mt-1 flex items-center rounded-xl border border-black/10 bg-white/70 px-2">
              <input
                type="number"
                min={1}
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                disabled={phase === 'dealing'}
                className="h-10 w-full bg-transparent font-mono text-sm outline-none"
              />
              <button
                onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
                className="px-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ½
              </button>
              <button
                onClick={() => setBet((b) => b * 2)}
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
                disabled={phase === 'dealing'}
                className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                {v.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="gradient"
              size="lg"
              className="sheen w-full"
              disabled={phase === 'dealing'}
              onClick={() => deal()}
            >
              <Sparkles className="h-5 w-5" /> Deal · {bet.toLocaleString()}
            </Button>
            {phase === 'result' ? (
              <Button
                variant="glass"
                size="lg"
                onClick={() => deal(seedRef.current)}
                title="Replay same round"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="card-premium grid grid-cols-2 gap-3 p-4 text-center">
          <Stat
            icon={<TrendingUp className="h-4 w-4 text-emerald" />}
            label="Best mult"
            value={`${stat.highest.toFixed(2)}×`}
          />
          <Stat
            icon={<Trophy className="h-4 w-4 text-gold" />}
            label="Best streak"
            value={String(stat.bestStreak)}
          />
          <Stat label="Rounds" value={String(stat.rounds)} />
          <Stat label="Biggest win" value={`+${stat.biggestWin.toLocaleString()}`} />
        </div>

        <div className="card-premium p-4">
          <p className="mb-2 flex items-center gap-2 font-display text-sm font-bold">History</p>
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

function Row({
  title,
  payout,
  cards,
  highlight,
  dim,
  tone,
}: {
  title: string;
  payout: number;
  cards: Card[];
  highlight?: boolean;
  dim?: boolean;
  tone: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl border border-black/5 bg-white/40 px-3 py-2 transition-all',
        highlight && 'bg-emerald/10 shadow-glow ring-2 ring-emerald/50',
        dim && 'opacity-45',
      )}
    >
      <div className="flex w-16 shrink-0 flex-col">
        <span className={cn('flex items-center gap-1 text-xs font-bold uppercase', tone)}>
          <Spade className="h-3 w-3" />
          {title}
        </span>
        <span className="font-mono text-[10px] font-semibold text-muted-foreground">{payout}×</span>
      </div>
      <div className="flex min-h-[3.5rem] flex-1 flex-wrap items-center gap-1 overflow-hidden">
        {cards.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          cards.map((c, i) => <PlayingCard key={`${c}-${i}`} code={c} small index={0} />)
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
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
