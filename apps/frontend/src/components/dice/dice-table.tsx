'use client';

import { Badge, Button, Spinner, cn } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, RotateCcw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DieFace } from '@/components/dice/die-face';
import {
  diceApi,
  type DiceBetDefinition,
  type DiceRoundResult,
  type DiceRuleSet,
  type DiceSessionView,
} from '@/lib/dice-api';
import { useAuthStore } from '@/stores/auth-store';

const CHIPS = [1, 5, 25, 100];
const CHIP_COLORS: Record<number, string> = {
  1: 'bg-slate-500',
  5: 'bg-red-600',
  25: 'bg-green-600',
  100: 'bg-purple-600',
};

const CATEGORY_LABEL: Record<string, string> = {
  range: 'Big / Small',
  parity: 'Odd / Even',
  pattern: 'Triples & Doubles',
  total: 'Totals',
  face: 'Single Numbers',
  combo: 'Combinations',
};
const CATEGORY_ORDER = ['range', 'parity', 'pattern', 'face', 'total', 'combo'];

interface Chip {
  type: string;
  amount: number;
}

export function DiceTable({ variant, title }: { variant: string; title: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialized = useAuthStore((s) => s.initialized);

  const ruleset = useQuery<DiceRuleSet>({
    queryKey: ['dice-variant', variant],
    queryFn: () => diceApi.variant(variant),
  });

  const [session, setSession] = useState<DiceSessionView | null>(null);
  const [chip, setChip] = useState(5);
  const [chips, setChips] = useState<Chip[]>([]);
  const [lastRound, setLastRound] = useState<Chip[]>([]);
  const [result, setResult] = useState<DiceRoundResult | null>(null);
  const [history, setHistory] = useState<DiceRoundResult[]>([]);
  const [rolling, setRolling] = useState(false);
  const [showFairness, setShowFairness] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!initialized || !isAuthenticated || startedRef.current) return;
    startedRef.current = true;
    diceApi
      .createSession({ variantKey: variant, mode: 'demo' })
      .then((r) => setSession(r.session))
      .catch(() => toast.error('Unable to start table'));
  }, [variant, isAuthenticated, initialized]);

  const staked = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of chips) map.set(c.type, (map.get(c.type) ?? 0) + c.amount);
    return map;
  }, [chips]);
  const totalStake = chips.reduce((a, c) => a + c.amount, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, DiceBetDefinition[]>();
    for (const bet of ruleset.data?.bets ?? []) {
      const list = map.get(bet.category) ?? [];
      list.push(bet);
      map.set(bet.category, list);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, bets: map.get(c)! }));
  }, [ruleset.data]);

  const place = (type: string) => {
    if (rolling) return;
    setChips((c) => [...c, { type, amount: chip }]);
  };
  const undo = () => setChips((c) => c.slice(0, -1));
  const clear = () => setChips([]);
  const repeat = () => setChips(lastRound.map((c) => ({ ...c })));
  const double = () => setChips((c) => c.map((x) => ({ ...x, amount: x.amount * 2 })));

  const finalize = useCallback((r: DiceRoundResult) => {
    setResult(r);
    setHistory((h) => [r, ...h].slice(0, 24));
  }, []);

  const roll = async () => {
    if (!session || chips.length === 0) {
      if (chips.length === 0) toast.info('Place a bet first');
      return;
    }
    const bySpot = new Map<string, number>();
    for (const c of chips) bySpot.set(c.type, (bySpot.get(c.type) ?? 0) + c.amount);
    const bets = [...bySpot.entries()].map(([type, amount]) => ({ type, amount: String(amount) }));

    setRolling(true);
    setResult(null);
    try {
      const r = await diceApi.roll(session.sessionId, bets);
      setLastRound(chips.map((c) => ({ ...c })));
      setChips([]);
      setTimeout(() => finalize(r), 950);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Roll failed');
    } finally {
      setTimeout(() => setRolling(false), 1000);
    }
  };

  if (initialized && !isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-emerald-50 to-white text-center">
        <p className="text-lg font-semibold text-foreground">Sign in to play</p>
        <Button asChild variant="gradient">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const faces = ruleset.data?.faces ?? 6;
  const displayDice = result?.values ?? Array.from({ length: ruleset.data?.diceCount ?? 2 }, () => 1);

  return (
    <div className="bg-grid flex h-full flex-col bg-gradient-to-b from-emerald-50 via-background to-accent/5">
      <header className="glass-strong flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dice">
              <ChevronLeft className="h-4 w-4" /> Lobby
            </Link>
          </Button>
          <span className="font-display font-semibold text-foreground">{title}</span>
          <Badge variant="secondary">
            {ruleset.data?.diceCount ?? '…'}×d{faces}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowFairness((v) => !v)}>
          <ShieldCheck className="h-4 w-4" /> Provably Fair
        </Button>
      </header>

      {/* History strip */}
      <div className="glass flex items-center gap-1.5 overflow-x-auto border-b border-border/30 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">Totals:</span>
        {history.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          history.map((r, i) => (
            <span
              key={`${r.roundId}-${i}`}
              className={cn(
                'flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums text-white shadow-sm',
                r.isTriple ? 'bg-gold' : Number(r.settlement.totalWin) > 0 ? 'bg-emerald' : 'bg-muted-foreground',
              )}
            >
              {r.total}
            </span>
          ))
        )}
      </div>

      <main className="relative flex-1 overflow-auto p-4">
        {ruleset.isLoading || !session ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[260px_1fr]">
            {/* Dice + result */}
            <div className="flex flex-col items-center gap-4">
              <div className="card-premium flex min-h-[120px] w-full flex-wrap items-center justify-center gap-3 bg-gradient-to-b from-emerald-100 to-white p-6 shadow-glow">
                {displayDice.map((v, i) => (
                  <DieFace
                    key={i}
                    value={v}
                    spins={result?.spins?.[i] ?? 4}
                    rolling={rolling}
                    index={i}
                    highlight={!!result?.isTriple}
                  />
                ))}
              </div>
              <AnimatePresence>
                {result ? (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-foreground"
                  >
                    <p className="text-gradient font-display text-4xl font-bold tabular-nums">{result.total}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {String(result.details.range ?? '')} · {String(result.details.parity ?? '')}
                      {result.isTriple ? ' · triple' : ''}
                    </p>
                    {result.winningBets.length > 0 ? (
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {result.winningBets.map((b) => (
                          <Badge key={b} variant="success">
                            {b}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">No win</p>
                    )}
                    <p className="mt-1 text-sm">
                      {Number(result.settlement.totalWin) > 0
                        ? `Won ${result.settlement.totalWin}`
                        : ''}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <StatsPanel history={history} />
              <PopularBetsPanel />
              <LivePlayersPanel />
              <ProvablyFairCard onOpen={() => setShowFairness(true)} />
            </div>

            {/* Betting board */}
            <div className="space-y-4">
              <RecentRollsCard history={history} />
              {grouped.map(({ category, bets }) => (
                <div key={category}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {CATEGORY_LABEL[category] ?? category}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {bets.map((bet) => {
                      const amt = staked.get(bet.key) ?? 0;
                      const won = result?.winningBets.includes(bet.key);
                      return (
                        <button
                          key={bet.key}
                          onClick={() => place(bet.key)}
                          disabled={rolling}
                          className={cn(
                            'relative flex flex-col items-center gap-0.5 rounded-xl border-2 border-dashed border-border bg-white/70 p-2 text-center backdrop-blur transition-colors hover:border-primary hover:bg-primary/5',
                            amt > 0 && 'border-primary bg-primary/10',
                            won && 'border-emerald bg-emerald/15',
                          )}
                        >
                          <span className="text-xs font-semibold text-foreground">{bet.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {bet.perOccurrence ? `${bet.payout}×/die` : `${bet.payout}×`}
                          </span>
                          {amt > 0 ? (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold tabular-nums text-gold-foreground shadow-sm">
                              {amt}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showFairness && session ? (
          <FairnessPanel
            session={session}
            result={result}
            variant={variant}
            onClose={() => setShowFairness(false)}
          />
        ) : null}
      </main>

      {/* Controls */}
      <footer className="glass-strong shrink-0 space-y-3 border-t border-border/40 p-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => setChip(c)}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold tabular-nums text-white shadow-md ring-2 transition-all',
                CHIP_COLORS[c],
                chip === c ? 'scale-110 ring-primary' : 'ring-transparent opacity-80 hover:opacity-100',
              )}
            >
              {c}
            </button>
          ))}
          <div className="ml-3 text-sm text-foreground">
            Stake: <span className="font-bold tabular-nums">{totalStake}</span>
            {ruleset.data ? <span className="text-muted-foreground"> / {ruleset.data.limits.tableMax}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={rolling || chips.length === 0} onClick={undo}>
            Undo
          </Button>
          <Button variant="outline" size="sm" disabled={rolling || lastRound.length === 0} onClick={repeat}>
            Repeat
          </Button>
          <Button variant="outline" size="sm" disabled={rolling || chips.length === 0} onClick={double}>
            Double
          </Button>
          <Button variant="outline" size="sm" disabled={rolling || chips.length === 0} onClick={clear}>
            <RotateCcw className="h-4 w-4" /> Clear
          </Button>
          <Button variant="gradient" size="lg" disabled={rolling || totalStake === 0} onClick={() => void roll()}>
            {rolling ? <Spinner size={18} /> : 'Roll'}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function StatsPanel({ history }: { history: DiceRoundResult[] }) {
  const total = history.length || 1;
  let big = 0;
  let small = 0;
  let triples = 0;
  for (const r of history) {
    if (r.isTriple) triples += 1;
    if (r.details.range === 'big') big += 1;
    else small += 1;
  }
  const rows: Array<[string, number]> = [
    ['Big', big],
    ['Small', small],
    ['Triples', triples],
  ];

  return (
    <div className="card-premium w-full p-3 text-xs text-foreground">
      <p className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground">Statistics</p>
      <div className="space-y-1">
        {rows.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between">
            <span>{label}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {count} · {Math.round((count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Mock-data presentation panels (no game logic) ---- */

const MOCK_RECENT_ROLLS: Array<{ total: number; win: boolean; triple: boolean }> = [
  { total: 11, win: true, triple: false },
  { total: 4, win: false, triple: false },
  { total: 14, win: true, triple: false },
  { total: 9, win: false, triple: false },
  { total: 15, win: true, triple: true },
  { total: 7, win: true, triple: false },
  { total: 10, win: false, triple: false },
  { total: 13, win: true, triple: false },
];

function RecentRollsCard({ history }: { history: DiceRoundResult[] }) {
  const rows =
    history.length > 0
      ? history.slice(0, 8).map((r) => ({
          total: r.total,
          win: Number(r.settlement.totalWin) > 0,
          triple: r.isTriple,
        }))
      : MOCK_RECENT_ROLLS;

  return (
    <div className="card-premium p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recent Rolls
      </p>
      <div className="flex flex-wrap gap-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className={cn(
              'flex h-9 min-w-9 flex-col items-center justify-center rounded-lg px-2 text-sm font-bold tabular-nums text-white shadow-sm',
              r.triple ? 'bg-gold' : r.win ? 'bg-emerald' : 'bg-destructive',
            )}
          >
            {r.total}
          </div>
        ))}
      </div>
    </div>
  );
}

const MOCK_POPULAR_BETS: Array<{ label: string; share: number; payout: string }> = [
  { label: 'Big', share: 38, payout: '2×' },
  { label: 'Small', share: 31, payout: '2×' },
  { label: 'Triple Any', share: 12, payout: '30×' },
  { label: 'Total 11', share: 9, payout: '6×' },
  { label: 'Odd', share: 6, payout: '2×' },
];

const MOCK_LIVE_PLAYERS: Array<{ name: string; bet: number; tone: 'win' | 'lose' }> = [
  { name: 'Nova_77', bet: 250, tone: 'win' },
  { name: 'GoldenAce', bet: 100, tone: 'lose' },
  { name: 'Lucky_Lin', bet: 500, tone: 'win' },
  { name: 'MidnightFox', bet: 75, tone: 'win' },
  { name: 'RollKing', bet: 320, tone: 'lose' },
];

function PopularBetsPanel() {
  return (
    <div className="card-premium w-full p-3 text-xs">
      <p className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground">Popular Bets</p>
      <div className="space-y-2">
        {MOCK_POPULAR_BETS.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex items-center justify-between text-foreground">
              <span className="font-medium">{b.label}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{b.payout}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${b.share}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LivePlayersPanel() {
  return (
    <div className="card-premium w-full p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold uppercase tracking-wider text-muted-foreground">Live Players</p>
        <Badge variant="live">live</Badge>
      </div>
      <div className="space-y-1.5">
        {MOCK_LIVE_PLAYERS.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-[10px] font-bold text-white">
              {p.name.slice(0, 1)}
            </span>
            <span className="truncate text-foreground">{p.name}</span>
            <span
              className={cn(
                'ml-auto font-mono tabular-nums',
                p.tone === 'win' ? 'text-emerald' : 'text-destructive',
              )}
            >
              {p.tone === 'win' ? '+' : '-'}
              {p.bet}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProvablyFairCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="card-premium w-full p-3 text-xs">
      <div className="mb-1.5 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald" />
        <p className="font-semibold uppercase tracking-wider text-muted-foreground">Provably Fair</p>
      </div>
      <p className="mb-2 text-muted-foreground">
        Every roll is generated from a hashed server seed and your client seed — verify any outcome
        yourself.
      </p>
      <Button variant="outline" size="sm" className="w-full" onClick={onOpen}>
        Verify outcomes
      </Button>
    </div>
  );
}

function FairnessPanel({
  session,
  result,
  variant,
  onClose,
}: {
  session: DiceSessionView;
  result: DiceRoundResult | null;
  variant: string;
  onClose: () => void;
}) {
  const [verified, setVerified] = useState<number[] | null>(null);
  const seed = result?.verification.seed;

  return (
    <div className="absolute inset-x-4 bottom-4 z-20 rounded-xl border border-border bg-card/95 p-4 text-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Provably Fair</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <dl className="space-y-1 font-mono text-xs">
        <div className="truncate">Server seed hash: {session.fairness.serverSeedHash}</div>
        <div className="truncate">Client seed: {session.fairness.clientSeed}</div>
        <div>Nonce: {session.fairness.nonce}</div>
        {seed ? <div className="truncate">Last roll seed: {seed}</div> : null}
      </dl>
      {seed ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => diceApi.verifyRoll(variant, seed).then((v) => setVerified(v.values))}
        >
          Verify roll outcome
        </Button>
      ) : null}
      {verified ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Re-derived dice: [{verified.join(', ')}]{' '}
          {result && verified.join(',') === result.values.join(',') ? '✓ matches' : ''}
        </p>
      ) : null}
    </div>
  );
}
