'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { RotateCcw, Swords, Trophy, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PlayingCard } from '@/components/card/playing-card';
import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { createDeck, rankOf, rankValue, shuffle, type Card } from '@/lib/deck';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useDemoWallet } from '@/stores/demo-wallet';
import { useGameStat } from '@/stores/game-stats';

const SLUG = 'casino-war';
const CHIPS = [100, 500, 1000, 5000];

type Phase = 'idle' | 'dealing' | 'war' | 'done';
type Outcome = 'player' | 'dealer' | 'tie';

interface Round {
  player: Card;
  dealer: Card;
  /** Second pair drawn only if the first is a tie and the player goes to war. */
  warPlayer: Card;
  warDealer: Card;
}

function buildRound(seed: number): Round {
  const deck = shuffle(createDeck(), seed);
  return {
    player: deck[0] ?? 'AS',
    dealer: deck[1] ?? 'KS',
    warPlayer: deck[2] ?? 'QS',
    warDealer: deck[3] ?? 'JS',
  };
}

function compare(p: Card, d: Card): Outcome {
  const pv = rankValue(p);
  const dv = rankValue(d);
  if (pv > dv) return 'player';
  if (dv > pv) return 'dealer';
  return 'tie';
}

export function CasinoWarGame() {
  const balance = useDemoWallet((s) => s.balance);
  const stat = useGameStat(SLUG);

  const [phase, setPhase] = useState<Phase>('idle');
  const [bet, setBet] = useState(100);
  const [round, setRound] = useState<Round | null>(null);
  const [war, setWar] = useState(false); // are we showing/using the war cards?
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<{ outcome: Outcome; net: number; win: boolean; wentToWar: boolean } | null>(
    null,
  );
  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const seedRef = useRef(1);
  const stakeRef = useRef(0); // committed stake (doubles on war)
  const timers = useRef<number[]>([]);
  const fxKeyRef = useRef(0);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const settle = useCallback((outcome: Outcome, stake: number, wentToWar: boolean) => {
    // War win pays even money on the doubled stake; a plain win pays 2×.
    const win = outcome === 'player';
    const { net } = settleRound({
      game: SLUG,
      stake,
      win,
      multiplier: 2,
      label: win ? (wentToWar ? 'War won' : 'Battle won') : outcome === 'tie' ? 'Push→loss' : 'Dealer wins',
      value: win ? 2 : 0,
    });
    setResult({ outcome, net, win, wentToWar });
    setPhase('done');
    if (win) {
      fxKeyRef.current += 1;
      setFx({ key: fxKeyRef.current, type: 'win', amount: net });
      toast.success(`${wentToWar ? 'War won!' : 'You win!'} +${net.toLocaleString()}`);
    } else {
      toast.error(outcome === 'dealer' ? 'Dealer takes it.' : 'Surrendered the war.');
    }
  }, []);

  const goToWar = useCallback(() => {
    if (!round || phase !== 'war') return;
    const extra = stakeRef.current; // double: match the original stake again
    if (extra > balance) {
      toast.error('Not enough demo coins to go to war — reload the balance pill.');
      return;
    }
    useDemoWallet.getState().spend(extra);
    stakeRef.current += extra;
    setWar(true);
    setRevealed(false);
    setPhase('dealing');
    sound.play('cardFlip');
    sound.play('chips');
    timers.current.push(
      window.setTimeout(() => {
        setRevealed(true);
        sound.play('cardFlip');
      }, 500),
    );
    timers.current.push(
      window.setTimeout(() => {
        const outcome = compare(round.warPlayer, round.warDealer);
        // On a second tie, dealer edge wins (standard casino war rule).
        settle(outcome === 'player' ? 'player' : 'dealer', stakeRef.current, true);
      }, 1000),
    );
  }, [round, phase, balance, settle]);

  const surrender = useCallback(() => {
    if (phase !== 'war') return;
    // Forfeit: lose the committed stake.
    settle('dealer', stakeRef.current, false);
  }, [phase, settle]);

  const deal = useCallback(
    (replaySeed?: number) => {
      if (phase === 'dealing' || phase === 'war') return;
      const stake = Math.max(1, Math.floor(bet));
      if (stake > balance) {
        toast.error('Not enough demo coins — hit reload in the balance pill.');
        return;
      }
      const seed =
        replaySeed ?? (Math.floor((performance.now() * 1000) % 2 ** 31) ^ (stat.seq * 2654435761)) >>> 0;
      seedRef.current = seed >>> 0;
      const r = buildRound(seedRef.current);

      useDemoWallet.getState().spend(stake);
      stakeRef.current = stake;
      clearTimers();
      setRound(r);
      setResult(null);
      setWar(false);
      setRevealed(false);
      setPhase('dealing');
      sound.play('cardFlip');

      timers.current.push(
        window.setTimeout(() => {
          setRevealed(true);
          sound.play('cardFlip');
        }, 550),
      );
      timers.current.push(
        window.setTimeout(() => {
          const outcome = compare(r.player, r.dealer);
          if (outcome === 'tie') {
            setPhase('war');
            sound.play('notify');
            toast.info('Tie! Go to war to double, or surrender.');
          } else {
            settle(outcome, stake, false);
          }
        }, 1050),
      );
    },
    [phase, bet, balance, stat.seq, settle],
  );

  const dealing = phase === 'dealing';
  const busy = phase === 'dealing' || phase === 'war';
  const activePlayer = war && round ? round.warPlayer : round?.player;
  const activeDealer = war && round ? round.warDealer : round?.dealer;
  const winnerSide = result?.outcome;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Stage */}
      <div className="card-premium relative aspect-[16/10] overflow-hidden p-0">
        <GameFx trigger={fx} />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-white to-emerald-50" />
        <div className="bg-grid absolute inset-0 opacity-40" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 p-6">
          {war ? (
            <Badge variant="featured" className="animate-pulse">
              <Swords className="mr-1 h-3.5 w-3.5" /> WAR
            </Badge>
          ) : null}

          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <Combatant
              label="You"
              card={activePlayer}
              faceDown={!revealed}
              highlight={phase === 'done' && winnerSide === 'player'}
              value={revealed && activePlayer ? rankOf(activePlayer) : undefined}
            />
            <motion.div
              animate={dealing ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6, repeat: dealing ? Infinity : 0 }}
              className="font-display text-2xl font-bold text-emerald-700/60"
            >
              VS
            </motion.div>
            <Combatant
              label="Dealer"
              card={activeDealer}
              faceDown={!revealed}
              highlight={phase === 'done' && winnerSide === 'dealer'}
              value={revealed && activeDealer ? rankOf(activeDealer) : undefined}
            />
          </div>

          {phase === 'idle' && !round ? (
            <div className="text-center">
              <Swords className="mx-auto mb-2 h-9 w-9 animate-float text-primary" />
              <p className="font-display text-lg font-bold text-foreground">Place your bet & battle</p>
              <p className="text-sm text-muted-foreground">Higher card wins · ties go to war</p>
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
              {result.win ? `You won +${result.net.toLocaleString()}` : `Lost ${result.net.toLocaleString()}`}
            </motion.div>
          ) : (
            <p className="font-display text-sm font-semibold text-emerald-700/70">
              {phase === 'war' ? 'Tie! Go to war or surrender.' : dealing ? 'Dealing…' : 'Ready'}
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
            Bet amount
            <div className="mt-1 flex items-center rounded-xl border border-black/10 bg-white/70 px-2">
              <input
                type="number"
                min={1}
                value={bet}
                onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value))))}
                disabled={busy}
                className="h-10 w-full bg-transparent font-mono text-sm outline-none"
              />
              <button
                onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
                disabled={busy}
                className="px-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ½
              </button>
              <button
                onClick={() => setBet((b) => b * 2)}
                disabled={busy}
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
                disabled={busy}
                className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-60"
              >
                {v.toLocaleString()}
              </button>
            ))}
          </div>

          {phase === 'war' ? (
            <div className="flex gap-2">
              <Button variant="gradient" size="lg" className="w-full sheen" onClick={goToWar}>
                <Swords className="h-5 w-5" /> Go to War · +{stakeRef.current.toLocaleString()}
              </Button>
              <Button variant="glass" size="lg" onClick={surrender} title="Surrender">
                Fold
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="gradient"
                size="lg"
                className="w-full sheen"
                disabled={dealing}
                onClick={() => deal()}
              >
                <Swords className="h-5 w-5" /> Battle · {bet.toLocaleString()}
              </Button>
              {phase === 'done' ? (
                <Button variant="glass" size="lg" onClick={() => deal(seedRef.current)} title="Replay same round">
                  <RotateCcw className="h-5 w-5" />
                </Button>
              ) : null}
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground">
            Balance{' '}
            <AnimatedNumber value={balance} className="font-mono font-bold tabular-nums text-foreground" />
          </div>
        </div>

        <div className="card-premium grid grid-cols-2 gap-3 p-4 text-center">
          <Stat label="Highest" value={String(stat.highest)} />
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

function Combatant({
  label,
  card,
  faceDown,
  highlight,
  value,
}: {
  label: string;
  card?: Card;
  faceDown?: boolean;
  highlight?: boolean;
  value?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-display text-xs font-bold uppercase tracking-widest text-emerald-700/70">
        {label}
      </span>
      <motion.div
        animate={highlight ? { scale: [1, 1.12, 1] } : {}}
        transition={{ duration: 0.5 }}
        className={cn('rounded-xl', highlight && 'rounded-lg shadow-glow ring-2 ring-gold/60')}
      >
        {card ? <PlayingCard code={card} faceDown={faceDown} /> : <PlayingCard faceDown />}
      </motion.div>
      <span className="h-5 font-display text-lg font-bold tabular-nums text-foreground">
        {value === 'T' ? '10' : (value ?? '')}
      </span>
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
