'use client';

import { Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, RotateCcw, Sparkles, TrendingUp, Trophy, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { PlayingCard } from '@/components/card/playing-card';
import { baccaratValue, createDeck, shuffle, type Card } from '@/lib/deck';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useDemoWallet } from '@/stores/demo-wallet';
import { useGameStat } from '@/stores/game-stats';

const SLUG = 'baccarat';

type BetSide = 'player' | 'banker' | 'tie';
type Winner = 'player' | 'banker' | 'tie';

const PAYOUT: Record<BetSide, number> = { player: 2, banker: 1.95, tie: 9 };

interface Outcome {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: Winner;
}

const CHIPS = [100, 500, 1000, 5000] as const;

/**
 * Resolve a full baccarat coup from a seed using simplified (but standard) rules:
 * naturals stand on 8/9; otherwise the third-card rule table is applied.
 */
function resolve(seed: number): Outcome {
  const shoe = shuffle(createDeck(6), seed);
  let i = 0;
  const draw = (): Card => {
    const c = shoe[i] ?? 'AS';
    i += 1;
    return c;
  };

  const playerCards: Card[] = [draw(), draw()];
  const bankerCards: Card[] = [draw(), draw()];

  const pv = () => baccaratValue(playerCards);
  const bv = () => baccaratValue(bankerCards);

  const natural = pv() >= 8 || bv() >= 8;

  if (!natural) {
    let playerThird: number | null = null;
    // Player rule: draws on 0-5, stands on 6-7.
    if (pv() <= 5) {
      const c = draw();
      playerThird = baccaratValue([c]);
      playerCards.push(c);
    }

    // Banker rule.
    const b = bv();
    let bankerDraws = false;
    if (playerThird === null) {
      bankerDraws = b <= 5;
    } else {
      if (b <= 2) bankerDraws = true;
      else if (b === 3) bankerDraws = playerThird !== 8;
      else if (b === 4) bankerDraws = playerThird >= 2 && playerThird <= 7;
      else if (b === 5) bankerDraws = playerThird >= 4 && playerThird <= 7;
      else if (b === 6) bankerDraws = playerThird === 6 || playerThird === 7;
      else bankerDraws = false;
    }
    if (bankerDraws) bankerCards.push(draw());
  }

  const playerTotal = pv();
  const bankerTotal = bv();
  const winner: Winner =
    playerTotal > bankerTotal ? 'player' : bankerTotal > playerTotal ? 'banker' : 'tie';

  return { playerCards, bankerCards, playerTotal, bankerTotal, winner };
}

type Phase = 'idle' | 'dealing' | 'result';

export function BaccaratGame() {
  const balance = useDemoWallet((s) => s.balance);
  const stat = useGameStat(SLUG);

  const [bet, setBet] = useState(100);
  const [side, setSide] = useState<BetSide>('player');
  const [phase, setPhase] = useState<Phase>('idle');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [revealCount, setRevealCount] = useState(0);
  const [result, setResult] = useState<{ win: boolean; net: number } | null>(null);
  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const timers = useRef<number[]>([]);
  const seedRef = useRef(1);
  const fxKeyRef = useRef(0);
  const stakeRef = useRef(0);
  const sideRef = useRef<BetSide>('player');

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
    const label =
      o.winner === 'tie'
        ? `Tie ${o.playerTotal}`
        : `${o.winner === 'player' ? 'Player' : 'Banker'} ${
            o.winner === 'player' ? o.playerTotal : o.bankerTotal
          }`;

    const { net } = settleRound({
      game: SLUG,
      stake,
      win,
      multiplier,
      label,
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
      setPhase('dealing');
      setRevealCount(0);

      const total = o.playerCards.length + o.bankerCards.length;
      for (let n = 1; n <= total; n += 1) {
        const id = window.setTimeout(() => {
          setRevealCount(n);
          sound.play('cardFlip');
        }, n * 420);
        timers.current.push(id);
      }
      const doneId = window.setTimeout(() => finish(o), total * 420 + 350);
      timers.current.push(doneId);
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

  const playerShown = outcome ? Math.min(outcome.playerCards.length, revealCount) : 0;
  const bankerShown = outcome
    ? Math.min(outcome.bankerCards.length, Math.max(0, revealCount - outcome.playerCards.length))
    : 0;

  const winner = phase === 'result' ? outcome?.winner : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Stage */}
      <div className="card-premium relative aspect-[16/10] overflow-hidden p-0">
        <GameFx trigger={fx} />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-white to-emerald-50" />
        <div className="bg-grid absolute inset-0 opacity-30" />

        <div className="relative flex h-full flex-col items-center justify-center gap-4 p-4">
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

          {/* Player row */}
          <Hand
            title="Player"
            icon={<User className="h-3.5 w-3.5" />}
            cards={outcome?.playerCards ?? []}
            shown={playerShown}
            total={phase === 'result' ? outcome?.playerTotal : undefined}
            highlight={winner === 'player'}
            dim={phase === 'result' && winner !== 'player' && winner !== 'tie'}
            tone="text-primary"
          />

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span className="h-px w-8 bg-border" /> VS <span className="h-px w-8 bg-border" />
          </div>

          {/* Banker row */}
          <Hand
            title="Banker"
            icon={<Crown className="h-3.5 w-3.5" />}
            cards={outcome?.bankerCards ?? []}
            shown={bankerShown}
            total={phase === 'result' ? outcome?.bankerTotal : undefined}
            highlight={winner === 'banker'}
            dim={phase === 'result' && winner !== 'banker' && winner !== 'tie'}
            tone="text-gold"
          />

          {/* Result / prompt */}
          <div className="min-h-[2.5rem]">
            <AnimatePresence mode="wait">
              {phase === 'result' && result ? (
                <motion.div
                  key="res"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <p
                    className={cn(
                      'font-display text-2xl font-bold',
                      result.win ? 'text-emerald' : 'text-destructive',
                    )}
                  >
                    {result.win
                      ? `You won +${result.net.toLocaleString()}`
                      : `${outcome?.winner === 'tie' ? 'Tie' : outcome?.winner === 'player' ? 'Player' : 'Banker'} wins · ${result.net.toLocaleString()}`}
                  </p>
                </motion.div>
              ) : phase === 'idle' ? (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center font-display text-lg font-bold text-foreground"
                >
                  Bet on Player, Banker or Tie
                </motion.p>
              ) : (
                <motion.p
                  key="deal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm font-semibold text-muted-foreground"
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
          {/* Bet selection */}
          <div className="grid grid-cols-3 gap-2">
            {(['player', 'tie', 'banker'] as const).map((s) => (
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

          {/* Bet amount */}
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
                title="Replay same coup"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        </div>

        {/* Stats */}
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

function Hand({
  title,
  icon,
  cards,
  shown,
  total,
  highlight,
  dim,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  cards: Card[];
  shown: number;
  total?: number;
  highlight?: boolean;
  dim?: boolean;
  tone: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-2xl px-4 py-2 transition-all',
        highlight && 'bg-emerald/10 shadow-glow ring-2 ring-emerald/50',
        dim && 'opacity-45',
      )}
    >
      <div className={cn('flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide', tone)}>
        {icon}
        {title}
        {typeof total === 'number' ? (
          <span className="rounded-md bg-white/70 px-1.5 font-mono text-foreground">{total}</span>
        ) : null}
      </div>
      <div className="flex min-h-[3.5rem] items-center gap-1.5">
        {cards.length === 0 ? (
          <>
            <PlayingCard faceDown small index={0} />
            <PlayingCard faceDown small index={1} />
          </>
        ) : (
          cards.map((c, i) => (
            <PlayingCard key={`${c}-${i}`} code={i < shown ? c : undefined} faceDown={i >= shown} small index={i} />
          ))
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
