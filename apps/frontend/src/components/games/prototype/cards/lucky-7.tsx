'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { ChevronsDown, ChevronsUp, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PlayingCard } from '@/components/card/playing-card';
import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { createDeck, rankOf, shuffle, type Card } from '@/lib/deck';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useDemoWallet } from '@/stores/demo-wallet';
import { useGameStat } from '@/stores/game-stats';

const SLUG = 'lucky-7';
const CHIPS = [100, 500, 1000, 5000];

/** Bet options: Under 7 (2×), Lucky 7 (11×), Over 7 (2×). */
type Pick = 'under' | 'seven' | 'over';
const PICKS: { id: Pick; label: string; hint: string; mult: number; icon: typeof ChevronsDown }[] = [
  { id: 'under', label: 'Under 7', hint: '1 – 6', mult: 2, icon: ChevronsDown },
  { id: 'seven', label: 'Lucky 7', hint: 'exactly 7', mult: 11, icon: Sparkles },
  { id: 'over', label: 'Over 7', hint: '8 – 13', mult: 2, icon: ChevronsUp },
];

type Phase = 'idle' | 'dealing' | 'done';

/** Pip number 1..13 (A=1, J=11, Q=12, K=13) — the value compared to 7. */
function pipValue(card: Card): number {
  const r = rankOf(card);
  if (r === 'A') return 1;
  if (r === 'K') return 13;
  if (r === 'Q') return 12;
  if (r === 'J') return 11;
  if (r === 'T') return 10;
  return Number(r);
}

function outcomeFor(pip: number): Pick {
  if (pip < 7) return 'under';
  if (pip === 7) return 'seven';
  return 'over';
}

export function Lucky7Game() {
  const balance = useDemoWallet((s) => s.balance);
  const stat = useGameStat(SLUG);

  const [phase, setPhase] = useState<Phase>('idle');
  const [bet, setBet] = useState(100);
  const [pick, setPick] = useState<Pick>('under');
  const [card, setCard] = useState<Card | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<{ win: boolean; net: number; pip: number; outcome: Pick } | null>(null);
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
    (drawn: Card) => {
      const pip = pipValue(drawn);
      const outcome = outcomeFor(pip);
      const chosen = PICKS.find((p) => p.id === pick)!;
      const win = outcome === pick;
      const stake = Math.max(1, Math.floor(bet));

      const { net } = settleRound({
        game: SLUG,
        stake,
        win,
        multiplier: chosen.mult,
        label: win ? `${pip} · ${chosen.label}` : `${pip} · miss`,
        value: pip,
      });

      setResult({ win, net, pip, outcome });
      setPhase('done');
      if (win) {
        fxKeyRef.current += 1;
        setFx({ key: fxKeyRef.current, type: 'win', amount: net });
        toast.success(`Card ${pip} — ${chosen.label} pays ${chosen.mult}× · +${net.toLocaleString()}`);
      } else {
        toast.error(`Card ${pip} landed ${outcome === 'seven' ? 'on 7' : outcome}. Better luck next deal.`);
      }
    },
    [bet, pick],
  );

  const deal = useCallback(
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

      const deck = shuffle(createDeck(), seedRef.current);
      const drawn = deck[0] ?? 'AS';

      useDemoWallet.getState().spend(stake);
      clearTimers();
      setResult(null);
      setRevealed(false);
      setCard(drawn);
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
          settle(drawn);
        }, 1050),
      );
    },
    [phase, bet, balance, stat.seq, settle],
  );

  const dealing = phase === 'dealing';
  const pip = revealed && card ? pipValue(card) : null;

  return (
    <div className="grid gap-4 lg:gap-6 lg:grid-cols-[2.2fr_1fr] xl:grid-cols-[2.5fr_1fr]">
      {/* Stage */}
      <div className="card-premium relative aspect-[16/10] overflow-hidden p-0">
        <GameFx trigger={fx} />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-white to-emerald-50" />
        <div className="bg-grid absolute inset-0 opacity-40" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 p-6">
          {/* number reveal */}
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-bold uppercase tracking-widest text-emerald-700/70">
              Under
            </span>
            <div
              className={cn(
                'grid h-16 w-16 place-items-center rounded-2xl border-2 font-display text-4xl font-bold tabular-nums shadow-glow transition-colors',
                pip === null
                  ? 'border-emerald-300/50 bg-white/60 text-emerald-400'
                  : pip < 7
                    ? 'border-primary bg-primary/10 text-primary'
                    : pip === 7
                      ? 'border-gold bg-gold/15 text-gold text-glow'
                      : 'border-accent bg-accent/10 text-accent',
              )}
            >
              {pip === null ? (
                <span className="text-2xl text-emerald-400">7</span>
              ) : (
                <motion.span key={pip} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  {pip}
                </motion.span>
              )}
            </div>
            <span className="font-display text-sm font-bold uppercase tracking-widest text-emerald-700/70">
              Over
            </span>
          </div>

          {/* the card */}
          <div className="flex min-h-[7rem] items-center justify-center">
            {card ? (
              <motion.div
                key={`${seedRef.current}-${revealed}`}
                animate={result?.win ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 0.5 }}
                className={cn(
                  'rounded-xl',
                  result?.win && 'shadow-glow ring-2 ring-gold/60 rounded-lg',
                )}
              >
                <PlayingCard code={card} faceDown={!revealed} />
              </motion.div>
            ) : (
              <div className="text-center">
                <Sparkles className="mx-auto mb-2 h-9 w-9 animate-float text-gold" />
                <p className="font-display text-lg font-bold text-foreground">Pick a side & deal</p>
                <p className="text-sm text-muted-foreground">Beat, hit, or dodge the lucky 7</p>
              </div>
            )}
          </div>

          {/* result banner */}
          {phase === 'done' && result ? (
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-sm font-bold shadow',
                result.win ? 'bg-emerald/15 text-emerald' : 'bg-destructive/15 text-destructive',
              )}
            >
              {result.win ? <Trophy className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {result.win ? `You won +${result.net.toLocaleString()}` : `Missed · ${result.net.toLocaleString()}`}
            </motion.div>
          ) : (
            <p className="font-display text-sm font-semibold text-emerald-700/70">
              {dealing ? 'Dealing…' : `Betting ${PICKS.find((p) => p.id === pick)!.label}`}
            </p>
          )}
        </div>

        {/* recent strip */}
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
          {/* pick selection */}
          <div className="grid grid-cols-3 gap-2">
            {PICKS.map((p) => {
              const Icon = p.icon;
              const active = pick === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPick(p.id)}
                  disabled={dealing}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-xl border-2 p-2 transition-all disabled:opacity-60',
                    active
                      ? 'border-primary bg-primary/10 text-primary shadow-glow'
                      : 'border-black/10 bg-white/60 text-muted-foreground hover:border-primary/40',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-display text-xs font-bold">{p.label}</span>
                  <span className="text-[10px]">{p.hint}</span>
                  <Badge variant={active ? 'featured' : 'secondary'} className="mt-0.5 text-[10px]">
                    {p.mult}×
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* bet input */}
          <label className="block text-xs font-semibold text-muted-foreground">
            Bet amount
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
              onClick={() => deal()}
            >
              <Sparkles className="h-5 w-5" /> Deal · {bet.toLocaleString()}
            </Button>
            {phase === 'done' ? (
              <Button variant="glass" size="lg" onClick={() => deal(seedRef.current)} title="Replay same card">
                <RotateCcw className="h-5 w-5" />
              </Button>
            ) : null}
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Balance{' '}
            <AnimatedNumber value={balance} className="font-mono font-bold tabular-nums text-foreground" />
          </div>
        </div>

        <div className="card-premium grid grid-cols-2 gap-3 p-4 text-center">
          <Stat label="Highest pip" value={String(stat.highest)} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] p-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
