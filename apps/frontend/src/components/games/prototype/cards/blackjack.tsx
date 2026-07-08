'use client';

import { Button, cn } from '@gaming-platform/ui';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PlayingCard } from '@/components/card/playing-card';
import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { blackjackHand, type Card, createDeck, shuffle } from '@/lib/deck';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useDemoWallet } from '@/stores/demo-wallet';
import { useGameStat, useGameStats } from '@/stores/game-stats';

type Phase = 'bet' | 'player' | 'dealer' | 'done';
const CHIPS = [100, 500, 1000, 5000];

export function BlackjackGame() {
  const balance = useDemoWallet((s) => s.balance);
  const spend = useDemoWallet((s) => s.spend);
  const refund = useDemoWallet((s) => s.refund);
  const stat = useGameStat('blackjack');

  const [phase, setPhase] = useState<Phase>('bet');
  const [bet, setBet] = useState(500);
  const [wager, setWager] = useState(0);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [reveal, setReveal] = useState(false);
  const [result, setResult] = useState<{ text: string; tone: 'win' | 'lose' | 'push' } | null>(null);
  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const deckRef = useRef<Card[]>([]);
  const seedRef = useRef(1);
  const fxKey = useRef(0);
  const timers = useRef<number[]>([]);
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const pv = blackjackHand(player);
  const dv = blackjackHand(dealer);

  const finish = useCallback(
    (finalPlayer: Card[], finalDealer: Card[]) => {
      const p = blackjackHand(finalPlayer);
      const d = blackjackHand(finalDealer);
      setReveal(true);
      let tone: 'win' | 'lose' | 'push';
      let text: string;
      if (p.total > 21) {
        tone = 'lose';
        text = 'Bust!';
      } else if (d.total > 21) {
        tone = 'win';
        text = 'Dealer busts — you win!';
      } else if (p.blackjack && !d.blackjack) {
        tone = 'win';
        text = 'Blackjack!';
      } else if (p.total > d.total) {
        tone = 'win';
        text = `You win ${p.total} vs ${d.total}`;
      } else if (p.total < d.total) {
        tone = 'lose';
        text = `Dealer wins ${d.total} vs ${p.total}`;
      } else {
        tone = 'push';
        text = `Push — ${p.total} each`;
      }

      if (tone === 'win') {
        const mult = p.blackjack ? 2.5 : 2;
        fxKey.current += 1;
        setFx({ key: fxKey.current, type: 'win', amount: Math.round(wager * mult - wager) });
        settleRound({ game: 'blackjack', stake: wager, win: true, multiplier: mult, label: p.blackjack ? 'Blackjack!' : `Win ${p.total}`, value: p.total });
      } else if (tone === 'push') {
        refund(wager, { label: 'Blackjack push', source: 'blackjack' }); // return stake
        useGameStats.getState().record('blackjack', { label: 'Push', win: false, payout: 0, value: p.total });
        sound.play('notify');
      } else {
        settleRound({ game: 'blackjack', stake: wager, win: false, multiplier: 0, label: `Loss ${p.total}`, value: p.total });
      }
      setResult({ text, tone });
      setPhase('done');
    },
    [wager, refund],
  );

  const dealerPlay = useCallback(
    (curDealer: Card[], curPlayer: Card[]) => {
      setPhase('dealer');
      setReveal(true);
      const play = (hand: Card[]) => {
        const v = blackjackHand(hand);
        if (v.total < 17) {
          const next = deckRef.current.pop();
          if (!next) return finish(curPlayer, hand);
          const nh = [...hand, next];
          setDealer(nh);
          sound.play('cardFlip');
          after(650, () => play(nh));
        } else {
          finish(curPlayer, hand);
        }
      };
      after(500, () => play(curDealer));
    },
    [finish],
  );

  const deal = useCallback(
    (replaySeed?: number) => {
      const stake = Math.max(1, Math.floor(bet));
      if (stake > balance) {
        toast.error('Not enough demo coins — reload from the balance pill.');
        return;
      }
      timers.current.forEach(clearTimeout);
      timers.current = [];
      const seed = replaySeed ?? Math.floor(performance.now() * 1000) % 2 ** 31;
      seedRef.current = seed >>> 0;
      const d = shuffle(createDeck(6), seedRef.current);
      spend(stake);
      setWager(stake);
      setResult(null);
      setReveal(false);

      const p1 = d.pop()!;
      const d1 = d.pop()!;
      const p2 = d.pop()!;
      const d2 = d.pop()!;
      deckRef.current = d;
      const ph = [p1, p2];
      const dh = [d1, d2];
      setPlayer(ph);
      setDealer(dh);
      setPhase('player');
      sound.play('cardFlip');

      const p = blackjackHand(ph);
      const dd = blackjackHand(dh);
      if (p.blackjack || dd.blackjack) after(700, () => finish(ph, dh));
    },
    [bet, balance, spend, finish],
  );

  const hit = () => {
    if (phase !== 'player') return;
    const next = deckRef.current.pop();
    if (!next) return;
    const nh = [...player, next];
    setPlayer(nh);
    sound.play('cardFlip');
    if (blackjackHand(nh).total > 21) after(500, () => finish(nh, dealer));
  };
  const stand = () => {
    if (phase !== 'player') return;
    dealerPlay(dealer, player);
  };
  const double = () => {
    if (phase !== 'player' || player.length !== 2) return;
    if (wager > balance) {
      toast.error('Not enough to double.');
      return;
    }
    spend(wager);
    setWager((w) => w * 2);
    const next = deckRef.current.pop();
    if (!next) return;
    const nh = [...player, next];
    setPlayer(nh);
    sound.play('chips');
    after(500, () => (blackjackHand(nh).total > 21 ? finish(nh, dealer) : dealerPlay(dealer, nh)));
  };

  const inRound = phase === 'player' || phase === 'dealer';

  return (
    <div className="grid gap-4 lg:gap-6 lg:grid-cols-[2.2fr_1fr] xl:grid-cols-[2.5fr_1fr]">
      {/* Table */}
      <div className="card-premium relative overflow-hidden p-5">
        <GameFx trigger={fx} />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-100 via-white to-emerald-50" />
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="relative flex min-h-[22rem] flex-col justify-between gap-6">
          {/* Dealer */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dealer {reveal ? <span className="font-mono text-foreground">· {dv.total}</span> : null}
            </div>
            <div className="flex gap-2">
              {dealer.map((c, i) => (
                <PlayingCard key={`d${i}`} code={c} index={i} faceDown={i === 1 && !reveal} />
              ))}
              {dealer.length === 0 ? <EmptySlot /> : null}
            </div>
          </div>

          {/* Result banner */}
          {result ? (
            <div
              className={cn(
                'self-center rounded-full px-5 py-1.5 font-display text-lg font-bold',
                result.tone === 'win' ? 'bg-emerald/15 text-emerald' : result.tone === 'push' ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive',
              )}
            >
              {result.text}
            </div>
          ) : phase === 'bet' ? (
            <p className="self-center font-display text-lg font-bold text-muted-foreground">
              Place your bet & deal
            </p>
          ) : null}

          {/* Player */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              You <span className="font-mono text-foreground">· {pv.total}{pv.soft ? ' (soft)' : ''}</span>
            </div>
            <div className="flex gap-2">
              {player.map((c, i) => (
                <PlayingCard key={`p${i}`} code={c} index={i} />
              ))}
              {player.length === 0 ? <EmptySlot /> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div className="card-premium space-y-3 p-4">
          <label className="text-xs font-semibold text-muted-foreground">
            Bet amount
            <div className="mt-1 flex items-center rounded-xl border border-black/10 bg-white/70 px-2">
              <input
                type="number"
                min={1}
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                disabled={inRound}
                className="h-10 w-full bg-transparent font-mono text-sm outline-none"
              />
              <button onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))} disabled={inRound} className="px-1 text-xs text-muted-foreground hover:text-foreground">½</button>
              <button onClick={() => setBet((b) => b * 2)} disabled={inRound} className="px-1 text-xs text-muted-foreground hover:text-foreground">2×</button>
            </div>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((v) => (
              <button key={v} onClick={() => setBet(v)} disabled={inRound} className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                {v.toLocaleString('en-US')}
              </button>
            ))}
          </div>

          {phase === 'player' ? (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="gradient" onClick={hit}>Hit</Button>
              <Button variant="gold" onClick={stand}>Stand</Button>
              <Button variant="glass" onClick={double} disabled={player.length !== 2}>Double</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="gradient" size="lg" className="w-full sheen" onClick={() => deal()} disabled={phase === 'dealer'}>
                {phase === 'done' ? 'Deal again' : 'Deal'} · {bet.toLocaleString('en-US')}
              </Button>
              {phase === 'done' ? (
                <Button variant="glass" size="lg" onClick={() => deal(seedRef.current)} title="Replay same shoe">↻</Button>
              ) : null}
            </div>
          )}
        </div>

        <div className="card-premium grid grid-cols-2 gap-3 p-4 text-center">
          <Stat label="Best hand" value={String(stat.highest)} />
          <Stat label="Rounds" value={String(stat.rounds)} />
          <Stat label="Biggest win" value={`+${stat.biggestWin.toLocaleString('en-US')}`} />
          <Stat label="Win streak" value={String(stat.bestStreak)} />
        </div>

        <div className="card-premium p-4">
          <p className="mb-2 font-display text-sm font-bold">History</p>
          <div className="flex flex-wrap gap-1.5">
            {stat.history.slice(0, 12).map((r) => (
              <span key={r.id} className={cn('rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold', r.win ? 'bg-emerald/15 text-emerald' : r.payout === 0 ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive')}>
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptySlot() {
  return <div className="h-20 w-14 rounded-lg border-2 border-dashed border-emerald/30" />;
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] p-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
