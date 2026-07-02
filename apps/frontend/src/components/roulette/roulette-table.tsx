'use client';

import { Badge, Button, Spinner, cn } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, RotateCcw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { RouletteWheel } from '@/components/roulette/roulette-wheel';
import {
  rouletteApi,
  type RouletteColor,
  type RouletteRoundResult,
  type RouletteRuleSet,
  type RouletteSessionView,
} from '@/lib/roulette-api';
import { useAuthStore } from '@/stores/auth-store';

const CHIPS = [1, 5, 25, 100];
const CHIP_COLORS: Record<number, string> = {
  1: 'bg-slate-500',
  5: 'bg-red-600',
  25: 'bg-green-600',
  100: 'bg-purple-600',
};

interface Chip {
  spotId: string;
  type: string;
  amount: number;
  selection?: number[];
}

function colorOf(layout: RouletteRuleSet['layout'], n: number): RouletteColor {
  if (layout.greenPockets.includes(n)) return 'green';
  return layout.redNumbers.includes(n) ? 'red' : 'black';
}

const SWATCH: Record<RouletteColor, string> = {
  red: 'bg-destructive',
  black: 'bg-foreground',
  green: 'bg-emerald',
};

export function RouletteTable({ variant, title }: { variant: string; title: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialized = useAuthStore((s) => s.initialized);

  const ruleset = useQuery<RouletteRuleSet>({
    queryKey: ['roulette-variant', variant],
    queryFn: () => rouletteApi.variant(variant),
  });

  const [session, setSession] = useState<RouletteSessionView | null>(null);
  const [chip, setChip] = useState(5);
  const [chips, setChips] = useState<Chip[]>([]);
  const [lastRound, setLastRound] = useState<Chip[]>([]);
  const [result, setResult] = useState<RouletteRoundResult | null>(null);
  const [history, setHistory] = useState<RouletteRoundResult[]>([]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [showFairness, setShowFairness] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!initialized || !isAuthenticated || startedRef.current) return;
    startedRef.current = true;
    rouletteApi
      .createSession({ variantKey: variant, mode: 'demo' })
      .then((r) => setSession(r.session))
      .catch(() => toast.error('Unable to start table'));
  }, [variant, isAuthenticated, initialized]);

  const layout = ruleset.data?.layout;
  const limits = ruleset.data?.limits;

  const staked = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of chips) map.set(c.spotId, (map.get(c.spotId) ?? 0) + c.amount);
    return map;
  }, [chips]);
  const totalStake = chips.reduce((a, c) => a + c.amount, 0);

  const place = (spotId: string, type: string, selection?: number[]) => {
    if (spinning) return;
    setChips((c) => [...c, { spotId, type, amount: chip, selection }]);
  };
  const undo = () => setChips((c) => c.slice(0, -1));
  const clear = () => setChips([]);
  const repeat = () => setChips(lastRound.map((c) => ({ ...c })));
  const double = () => setChips((c) => c.map((x) => ({ ...x, amount: x.amount * 2 })));

  const finalize = useCallback((r: RouletteRoundResult) => {
    setResult(r);
    setHistory((h) => [r, ...h].slice(0, 24));
  }, []);

  const spin = async () => {
    if (!session || chips.length === 0) {
      if (chips.length === 0) toast.info('Place a bet first');
      return;
    }
    // Aggregate chips into bets by spot.
    const bySpot = new Map<string, { type: string; amount: number; selection?: number[] }>();
    for (const c of chips) {
      const existing = bySpot.get(c.spotId);
      if (existing) existing.amount += c.amount;
      else bySpot.set(c.spotId, { type: c.type, amount: c.amount, selection: c.selection });
    }
    const bets = [...bySpot.values()].map((b) => ({
      type: b.type,
      amount: String(b.amount),
      selection: b.selection,
    }));

    setSpinning(true);
    setResult(null);
    try {
      const r = await rouletteApi.spin(session.sessionId, bets);
      // Multiple revolutions for visual effect, landing on the deterministic angle.
      setRotation((prev) => prev + 360 * 6 + (r.rotation % 360));
      setLastRound(chips.map((c) => ({ ...c })));
      setChips([]);
      setTimeout(() => finalize(r), 3900);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Spin failed');
    } finally {
      setTimeout(() => setSpinning(false), 4000);
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

  return (
    <div className="bg-grid flex h-full flex-col bg-gradient-to-b from-emerald-50 via-background to-accent/5">
      <header className="glass-strong flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/roulette">
              <ChevronLeft className="h-4 w-4" /> Lobby
            </Link>
          </Button>
          <span className="font-display font-semibold text-foreground">{title}</span>
          {ruleset.data?.houseRules.laPartage ? <Badge variant="secondary">La Partage</Badge> : null}
          {ruleset.data?.houseRules.enPrison ? <Badge variant="secondary">En Prison</Badge> : null}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowFairness((v) => !v)}>
          <ShieldCheck className="h-4 w-4" /> Provably Fair
        </Button>
      </header>

      {/* History strip */}
      <div className="glass flex items-center gap-1.5 overflow-x-auto border-b border-border/30 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">Recent:</span>
        {history.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          history.map((r, i) => (
            <span
              key={`${r.roundId}-${i}`}
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums text-white shadow-sm',
                SWATCH[r.color],
              )}
            >
              {r.pocketLabel}
            </span>
          ))
        )}
      </div>

      <main className="relative flex-1 overflow-auto p-4">
        {ruleset.isLoading || !session || !layout ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[280px_1fr]">
            {/* Wheel + winning number */}
            <div className="flex flex-col items-center gap-4">
              <div className="card-premium flex w-full items-center justify-center bg-gradient-to-b from-emerald-100 to-white p-5 shadow-glow">
                <RouletteWheel layout={layout} rotation={rotation} spinning={spinning} />
              </div>
              <AnimatePresence>
                {result ? (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold tabular-nums text-white shadow-md',
                        SWATCH[result.color],
                      )}
                    >
                      {result.pocketLabel}
                    </span>
                    <div className="text-sm text-foreground">
                      <p className="font-bold capitalize">{result.color}</p>
                      <p className="text-muted-foreground">
                        {Number(result.settlement.totalWin) > 0
                          ? `Won ${result.settlement.totalWin}`
                          : 'No win'}
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <JackpotCard />
              <RecentNumbersCard history={history} />
              <HotColdCard history={history} layout={layout} />
              <StatsPanel layout={layout} history={history} />
              <SectorStatsCard history={history} layout={layout} />
              <LeaderboardCard />
            </div>

            {/* Betting board */}
            <BettingBoard
              layout={layout}
              staked={staked}
              onPlace={place}
              disabled={spinning}
            />
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
            {limits ? <span className="text-muted-foreground"> / {limits.tableMax}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={spinning || chips.length === 0} onClick={undo}>
            Undo
          </Button>
          <Button variant="outline" size="sm" disabled={spinning || lastRound.length === 0} onClick={repeat}>
            Repeat
          </Button>
          <Button variant="outline" size="sm" disabled={spinning || chips.length === 0} onClick={double}>
            Double
          </Button>
          <Button variant="outline" size="sm" disabled={spinning || chips.length === 0} onClick={clear}>
            <RotateCcw className="h-4 w-4" /> Clear
          </Button>
          <Button
            variant="gradient"
            size="lg"
            disabled={spinning || totalStake === 0}
            onClick={() => void spin()}
          >
            {spinning ? <Spinner size={18} /> : 'Spin'}
          </Button>
        </div>
      </footer>
    </div>
  );
}

/** The full inside + outside betting board, generated from the wheel layout. */
function BettingBoard({
  layout,
  staked,
  onPlace,
  disabled,
}: {
  layout: RouletteRuleSet['layout'];
  staked: Map<string, number>;
  onPlace: (spotId: string, type: string, selection?: number[]) => void;
  disabled: boolean;
}) {
  // Standard 3×12 grid: rows top→bottom are n%3 == 0, 2, 1.
  const rows = [3, 2, 1].map((rem) =>
    Array.from({ length: 12 }, (_, col) => col * 3 + (rem === 3 ? 3 : rem)),
  );
  const dozenCount = Math.ceil(layout.maxNumber / layout.dozenSize);

  const Spot = ({ id, type, selection, children, className }: {
    id: string;
    type: string;
    selection?: number[];
    children: React.ReactNode;
    className?: string;
  }) => {
    const amt = staked.get(id) ?? 0;
    return (
      <button
        disabled={disabled}
        onClick={() => onPlace(id, type, selection)}
        className={cn(
          'relative flex items-center justify-center rounded-sm border border-white/40 text-xs font-semibold tabular-nums text-white shadow-sm transition-all hover:brightness-110 hover:ring-2 hover:ring-gold',
          className,
        )}
      >
        {children}
        {amt > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold tabular-nums text-gold-foreground shadow-sm">
            {amt}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {/* Zeros column */}
        <div className="flex flex-col gap-1">
          {layout.greenPockets.map((z) => (
            <Spot
              key={z}
              id={`straight:${z}`}
              type="straight"
              selection={[z]}
              className="h-full min-h-[40px] w-10 bg-emerald"
            >
              {z === 37 ? '00' : z}
            </Spot>
          ))}
        </div>

        {/* Number grid */}
        <div className="grid flex-1 grid-rows-3 gap-1">
          {rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-12 gap-1">
              {row.map((n) => (
                <Spot
                  key={n}
                  id={`straight:${n}`}
                  type="straight"
                  selection={[n]}
                  className={cn('h-10', colorOf(layout, n) === 'red' ? 'bg-destructive' : 'bg-foreground')}
                >
                  {n}
                </Spot>
              ))}
            </div>
          ))}
        </div>

        {/* Column (2:1) bets */}
        <div className="grid grid-rows-3 gap-1">
          {[3, 2, 1].map((c) => (
            <Spot key={c} id={`column:${c}`} type="column" selection={[c]} className="h-10 w-12 bg-emerald">
              2:1
            </Spot>
          ))}
        </div>
      </div>

      {/* Dozens */}
      <div className="ml-11 grid gap-1" style={{ gridTemplateColumns: `repeat(${dozenCount}, minmax(0, 1fr))` }}>
        {Array.from({ length: dozenCount }, (_, i) => i + 1).map((d) => (
          <Spot key={d} id={`dozen:${d}`} type="dozen" selection={[d]} className="h-9 bg-emerald">
            {d === 1 ? '1st 12' : d === 2 ? '2nd 12' : d === 3 ? '3rd 12' : `Dozen ${d}`}
          </Spot>
        ))}
      </div>

      {/* Even-money outside bets */}
      <div className="ml-11 grid grid-cols-6 gap-1">
        <Spot id="low" type="low" className="h-9 bg-emerald">1-18</Spot>
        <Spot id="even" type="even" className="h-9 bg-emerald">EVEN</Spot>
        <Spot id="red" type="red" className="h-9 bg-destructive">RED</Spot>
        <Spot id="black" type="black" className="h-9 bg-foreground">BLACK</Spot>
        <Spot id="odd" type="odd" className="h-9 bg-emerald">ODD</Spot>
        <Spot id="high" type="high" className="h-9 bg-emerald">19-36</Spot>
      </div>
    </div>
  );
}

function StatsPanel({
  layout,
  history,
}: {
  layout: RouletteRuleSet['layout'];
  history: RouletteRoundResult[];
}) {
  const counts = { red: 0, black: 0, green: 0 } as Record<RouletteColor, number>;
  for (const r of history) counts[r.color] += 1;
  const total = history.length || 1;
  void layout;

  return (
    <div className="card-premium w-full p-3 text-xs text-foreground">
      <p className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground">Statistics</p>
      <div className="space-y-1">
        {(['red', 'black', 'green'] as RouletteColor[]).map((c) => (
          <div key={c} className="flex items-center gap-2">
            <span className={cn('h-3 w-3 rounded-full', SWATCH[c])} />
            <span className="capitalize">{c}</span>
            <span className="ml-auto font-mono tabular-nums text-muted-foreground">
              {counts[c]} · {Math.round((counts[c] / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Mock-data presentation panels (no game logic) ---- */

const MOCK_RECENT_NUMBERS: Array<{ n: number; color: RouletteColor }> = [
  { n: 7, color: 'red' },
  { n: 22, color: 'black' },
  { n: 0, color: 'green' },
  { n: 18, color: 'red' },
  { n: 31, color: 'black' },
  { n: 14, color: 'red' },
  { n: 26, color: 'black' },
  { n: 3, color: 'red' },
  { n: 11, color: 'black' },
  { n: 9, color: 'red' },
];

const MOCK_HOT = [
  { n: 7, hits: 14 },
  { n: 23, hits: 12 },
  { n: 17, hits: 11 },
  { n: 32, hits: 10 },
];
const MOCK_COLD = [
  { n: 6, hits: 1 },
  { n: 13, hits: 2 },
  { n: 28, hits: 2 },
  { n: 19, hits: 3 },
];

const MOCK_LEADERBOARD = [
  { name: 'HighRoller_X', profit: 4820 },
  { name: 'EmeraldQueen', profit: 3110 },
  { name: 'SpinDoctor', profit: 1995 },
  { name: 'Aria_88', profit: 1240 },
  { name: 'NeonViper', profit: 760 },
];

function JackpotCard() {
  return (
    <div className="card-premium w-full overflow-hidden p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Progressive Jackpot
      </p>
      <p className="text-gradient-gold font-display mt-1 text-3xl font-bold">
        <AnimatedNumber value={284910} prefix="$" live />
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">Grows with every spin across all tables</p>
    </div>
  );
}

function RecentNumbersCard({ history }: { history: RouletteRoundResult[] }) {
  const rows =
    history.length > 0
      ? history.slice(0, 10).map((r) => ({ n: r.pocket, label: r.pocketLabel, color: r.color }))
      : MOCK_RECENT_NUMBERS.map((m) => ({ n: m.n, label: m.n === 37 ? '00' : String(m.n), color: m.color }));

  return (
    <div className="card-premium w-full p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recent Numbers
      </p>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r, i) => (
          <span
            key={i}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold tabular-nums text-white shadow-sm',
              SWATCH[r.color],
            )}
          >
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function HotColdCard({
  history,
  layout,
}: {
  history: RouletteRoundResult[];
  layout: RouletteRuleSet['layout'];
}) {
  void history;
  void layout;
  return (
    <div className="card-premium w-full p-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 flex items-center gap-1 font-semibold uppercase tracking-wider text-destructive">
            Hot
          </p>
          <div className="space-y-1">
            {MOCK_HOT.map((h) => (
              <div key={h.n} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[10px] font-bold tabular-nums text-white">
                  {h.n}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">{h.hits} hits</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1 font-semibold uppercase tracking-wider text-accent">
            Cold
          </p>
          <div className="space-y-1">
            {MOCK_COLD.map((h) => (
              <div key={h.n} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold tabular-nums text-white">
                  {h.n}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">{h.hits} hits</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectorStatsCard({
  history,
  layout,
}: {
  history: RouletteRoundResult[];
  layout: RouletteRuleSet['layout'];
}) {
  void layout;
  // Tally even-money sectors from real history; fall back to a tasteful spread.
  let red = 0;
  let black = 0;
  let odd = 0;
  let even = 0;
  for (const r of history) {
    if (r.color === 'red') red += 1;
    else if (r.color === 'black') black += 1;
    if (r.color !== 'green') {
      if (r.pocket % 2 === 0) even += 1;
      else odd += 1;
    }
  }
  const hasData = history.length > 0;
  const rb = hasData ? { red, black } : { red: 52, black: 48 };
  const oe = hasData ? { odd, even } : { odd: 49, even: 51 };
  const rbTotal = rb.red + rb.black || 1;
  const oeTotal = oe.odd + oe.even || 1;

  const Bar = ({
    leftLabel,
    rightLabel,
    leftPct,
    leftClass,
    rightClass,
  }: {
    leftLabel: string;
    rightLabel: string;
    leftPct: number;
    leftClass: string;
    rightClass: string;
  }) => (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full">
        <div className={leftClass} style={{ width: `${leftPct}%` }} />
        <div className={cn('flex-1', rightClass)} />
      </div>
    </div>
  );

  return (
    <div className="card-premium w-full space-y-2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sector Stats
      </p>
      <Bar
        leftLabel={`Red ${Math.round((rb.red / rbTotal) * 100)}%`}
        rightLabel={`Black ${Math.round((rb.black / rbTotal) * 100)}%`}
        leftPct={(rb.red / rbTotal) * 100}
        leftClass="bg-destructive"
        rightClass="bg-foreground"
      />
      <Bar
        leftLabel={`Odd ${Math.round((oe.odd / oeTotal) * 100)}%`}
        rightLabel={`Even ${Math.round((oe.even / oeTotal) * 100)}%`}
        leftPct={(oe.odd / oeTotal) * 100}
        leftClass="bg-primary"
        rightClass="bg-accent"
      />
    </div>
  );
}

function LeaderboardCard() {
  return (
    <div className="card-premium w-full p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold uppercase tracking-wider text-muted-foreground">Leaderboard</p>
        <Badge variant="gold">today</Badge>
      </div>
      <div className="space-y-1.5">
        {MOCK_LEADERBOARD.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums',
                i === 0 ? 'bg-gold text-gold-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {i + 1}
            </span>
            <span className="truncate text-foreground">{p.name}</span>
            <span className="ml-auto font-mono tabular-nums text-emerald">+{p.profit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FairnessPanel({
  session,
  result,
  variant,
  onClose,
}: {
  session: RouletteSessionView;
  result: RouletteRoundResult | null;
  variant: string;
  onClose: () => void;
}) {
  const [verified, setVerified] = useState<{ pocket: number; label: string } | null>(null);
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
        {seed ? <div className="truncate">Last spin seed: {seed}</div> : null}
      </dl>
      {seed ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() =>
            rouletteApi.verifySpin(variant, seed).then((v) => setVerified({ pocket: v.pocket, label: v.label }))
          }
        >
          Verify spin outcome
        </Button>
      ) : null}
      {verified ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Re-derived pocket: {verified.label}{' '}
          {result && verified.pocket === result.pocket ? '✓ matches' : ''}
        </p>
      ) : null}
    </div>
  );
}
