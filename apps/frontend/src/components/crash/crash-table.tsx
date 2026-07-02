'use client';

import { Badge, Button, Spinner, cn } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Radio, ShieldCheck, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { CrashGraph, type CrashGraphStatus } from '@/components/crash/crash-graph';
import { clientConfig } from '@/lib/config';
import {
  crashApi,
  type CrashRoundResult,
  type CrashRuleSet,
  type CrashSessionView,
} from '@/lib/crash-api';
import { useAuthStore } from '@/stores/auth-store';

const CHIPS = [1, 5, 25, 100];
const CHIP_COLORS: Record<number, string> = {
  1: 'bg-gradient-to-br from-accent to-primary',
  5: 'bg-gradient-to-br from-destructive to-warning',
  25: 'bg-gradient-to-br from-emerald to-accent',
  100: 'bg-gradient-to-br from-primary to-pink',
};

// Presentation-only mock data for the live-bets ticker and leaderboard.
const LIVE_BETS = [
  { name: 'NovaStrike', amount: 50, mult: 2.41, status: 'won' as const },
  { name: 'CryptoFox', amount: 25, mult: null, status: 'in' as const },
  { name: 'LunaBet', amount: 100, mult: 5.92, status: 'won' as const },
  { name: 'PixelKing', amount: 10, mult: null, status: 'bust' as const },
  { name: 'ZeroCool', amount: 75, mult: 1.18, status: 'won' as const },
  { name: 'AceHigh', amount: 200, mult: null, status: 'in' as const },
];
const TOP_WINNERS = [
  { name: 'NovaStrike', mult: 84.21, payout: 21052 },
  { name: 'CryptoFox', mult: 49.18, payout: 12295 },
  { name: 'LunaBet', mult: 32.74, payout: 8185 },
];

export function CrashTable({ variant, title }: { variant: string; title: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialized = useAuthStore((s) => s.initialized);
  const token = useAuthStore((s) => s.accessToken);

  const ruleset = useQuery<CrashRuleSet>({
    queryKey: ['crash-variant', variant],
    queryFn: () => crashApi.variant(variant),
  });

  const [session, setSession] = useState<CrashSessionView | null>(null);
  const [amount, setAmount] = useState(5);
  const [autoCashout, setAutoCashout] = useState('');
  const [status, setStatus] = useState<CrashGraphStatus>('idle');
  const [multiplier, setMultiplier] = useState(1);
  const [samples, setSamples] = useState<number[]>([1]);
  const [result, setResult] = useState<CrashRoundResult | null>(null);
  const [history, setHistory] = useState<CrashRoundResult[]>([]);
  const [showFairness, setShowFairness] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const lastSampleRef = useRef(0);
  const statusRef = useRef<CrashGraphStatus>('idle');
  const rulesetRef = useRef<CrashRuleSet | null>(null);

  statusRef.current = status;
  rulesetRef.current = ruleset.data ?? null;

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const settle = useCallback((r: CrashRoundResult) => {
    stopLoop();
    const cashedOutAt = r.settlement.bets[0]?.cashedOutAt ?? null;
    const won = Number(r.settlement.totalWin) > 0 && cashedOutAt !== null;
    setStatus(won ? 'cashed' : 'crashed');
    setMultiplier(won ? cashedOutAt! : r.crashPoint);
    setResult(r);
    setHistory((h) => [r, ...h].slice(0, 24));
    window.setTimeout(() => {
      setStatus('idle');
      setMultiplier(1);
      setSamples([1]);
    }, 2600);
  }, [stopLoop]);

  // Boot: session + socket.
  useEffect(() => {
    if (!initialized || !isAuthenticated || !token) return;
    let cancelled = false;
    let socket: Socket | null = null;

    crashApi
      .createSession({ variantKey: variant, mode: 'demo' })
      .then((created) => {
        if (cancelled) return;
        setSession(created.session);
        socket = io(`${clientConfig.wsUrl}/crash`, {
          auth: { token },
          transports: ['websocket'],
          reconnectionAttempts: 10,
        });
        socketRef.current = socket;

        socket.on('connect', () => socket?.emit('crash:join', { sessionId: created.session.sessionId }));
        socket.on('crash:started', (data: { startedAt: number }) => {
          startedAtRef.current = data.startedAt;
          lastSampleRef.current = 0;
          setResult(null);
          setSamples([1]);
          setMultiplier(1);
          setStatus('running');
          runLoop();
        });
        socket.on('crash:result', (r: CrashRoundResult) => {
          if (!cancelled) settle(r);
        });
        socket.on('crash:error', (e: { message: string }) => toast.error(e.message));
      })
      .catch(() => toast.error('Unable to start table'));

    return () => {
      cancelled = true;
      stopLoop();
      socket?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, isAuthenticated, initialized, token]);

  // The rising-curve animation, driven locally from the server start time.
  const runLoop = useCallback(() => {
    const tick = () => {
      const rs = rulesetRef.current;
      if (!rs || statusRef.current !== 'running') return;
      const elapsed = Date.now() - startedAtRef.current;
      const raw = Math.exp(rs.growthRatePerSecond * (elapsed / 1000));
      const m = Math.min(rs.maxMultiplier, Math.max(rs.minMultiplier, Math.floor(raw * 100) / 100));
      setMultiplier(m);
      if (elapsed - lastSampleRef.current >= 80) {
        lastSampleRef.current = elapsed;
        setSamples((s) => (s.length > 260 ? [...s.slice(1), m] : [...s, m]));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => {
    const sock = socketRef.current;
    if (!sock || !session || status === 'running') return;
    const auto = autoCashout ? Number(autoCashout) : undefined;
    if (auto !== undefined && (Number.isNaN(auto) || auto <= (ruleset.data?.minMultiplier ?? 1))) {
      toast.info('Auto cash-out must be above 1.00');
      return;
    }
    sock.emit('crash:start', { sessionId: session.sessionId, amount: String(amount), autoCashout: auto });
  };

  const cashout = () => {
    const sock = socketRef.current;
    if (!sock || !session || status !== 'running') return;
    sock.emit('crash:cashout', { sessionId: session.sessionId });
  };

  if (initialized && !isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-primary/5 via-white to-accent/5 text-center">
        <p className="text-lg font-semibold text-foreground">Sign in to play</p>
        <Button asChild variant="gradient">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const running = status === 'running';
  const canManual = ruleset.data?.allowManualCashout ?? true;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-primary/5 via-white to-accent/5">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 glass px-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/crash">
              <ChevronLeft className="h-4 w-4" /> Lobby
            </Link>
          </Button>
          <span className="font-semibold text-foreground">{title}</span>
          <Badge variant="neon">edge {((ruleset.data?.houseEdge ?? 0) * 100).toFixed(1)}%</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="live" className="hidden gap-1 sm:flex">
            <Users className="h-3 w-3" />
            <AnimatedNumber value={1284} live /> online
          </Badge>
          <Button variant="glass" size="sm" onClick={() => setShowFairness((v) => !v)}>
            <ShieldCheck className="h-4 w-4" /> Provably Fair
          </Button>
        </div>
      </header>

      {/* History strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/40 glass-strong px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">Recent:</span>
        {history.length === 0 ? (
          // Seed a few mock rounds so the strip is never empty.
          [2.41, 1.18, 5.92, 1.04, 12.7, 3.33].map((m, i) => (
            <span
              key={`seed-${i}`}
              className={cn(
                'flex h-6 shrink-0 items-center justify-center rounded-full px-2 font-mono text-[10px] font-bold tabular-nums',
                m < 2
                  ? 'bg-destructive/12 text-destructive'
                  : m < 10
                    ? 'bg-warning/15 text-warning'
                    : 'bg-emerald/12 text-emerald',
              )}
            >
              {m.toFixed(2)}×
            </span>
          ))
        ) : (
          history.map((r, i) => (
            <span
              key={`${r.roundId}-${i}`}
              className={cn(
                'flex h-6 shrink-0 items-center justify-center rounded-full px-2 font-mono text-[10px] font-bold tabular-nums',
                r.crashPoint < 2
                  ? 'bg-destructive/12 text-destructive'
                  : r.crashPoint < 10
                    ? 'bg-warning/15 text-warning'
                    : 'bg-emerald/12 text-emerald',
              )}
            >
              {r.crashPoint.toFixed(2)}×
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
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <CrashGraph samples={samples} multiplier={multiplier} status={status} />
              {result ? (
                <p
                  className={cn(
                    'card-premium px-4 py-2 text-center text-sm font-medium',
                    Number(result.settlement.totalWin) > 0 ? 'text-emerald' : 'text-foreground',
                  )}
                >
                  Crashed at{' '}
                  <span className="font-mono font-bold tabular-nums">
                    {result.crashPoint.toFixed(2)}×
                  </span>
                  {Number(result.settlement.totalWin) > 0
                    ? ` · won ${result.settlement.totalWin}`
                    : ' · no win'}
                </p>
              ) : null}

              {/* Live bets ticker (mock) */}
              <div className="card-premium p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-destructive" />
                  <h2 className="text-sm font-semibold text-foreground">Live bets</h2>
                  <Badge variant="live" className="ml-auto gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                    {LIVE_BETS.length} active
                  </Badge>
                </div>
                <ul className="divide-y divide-border/40">
                  {LIVE_BETS.map((b, i) => (
                    <li key={`${b.name}-${i}`} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="font-medium text-foreground">{b.name}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          ${b.amount}
                        </span>
                        {b.status === 'won' ? (
                          <span className="font-mono text-xs font-bold text-emerald tabular-nums">
                            {b.mult!.toFixed(2)}×
                          </span>
                        ) : b.status === 'bust' ? (
                          <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                            bust
                          </Badge>
                        ) : (
                          <Badge variant="neon" className="px-1.5 py-0 text-[10px]">
                            in play
                          </Badge>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Side rail: top winners + provably-fair card */}
            <aside className="space-y-4">
              <div className="card-premium p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gold" />
                  <h2 className="text-sm font-semibold text-foreground">Leaderboard</h2>
                </div>
                <ul className="space-y-2">
                  {TOP_WINNERS.map((w, i) => (
                    <li key={w.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-foreground">{w.name}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-mono text-xs font-bold text-emerald tabular-nums">
                          {w.mult.toFixed(2)}×
                        </span>
                        <span className="block font-mono text-[11px] text-muted-foreground tabular-nums">
                          ${w.payout.toLocaleString()}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-premium p-4">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Provably Fair</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Every crash point is derived from a server seed, client seed and nonce — verifiable
                  after each round.
                </p>
                <Button
                  variant="glass"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => setShowFairness((v) => !v)}
                >
                  View seeds
                </Button>
              </div>
            </aside>
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
      <footer className="shrink-0 border-t border-border/60 glass-strong p-4">
        <div className="card-premium mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex flex-col">
            <label className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Bet amount
            </label>
            <div className="flex items-center gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAmount(c)}
                  disabled={running}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-glow-sm ring-2 transition-all',
                    CHIP_COLORS[c],
                    amount === c ? 'scale-110 ring-primary' : 'ring-transparent opacity-80',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Auto cash-out (×)
            </label>
            <input
              type="number"
              step="0.1"
              min="1.01"
              placeholder="e.g. 2.0"
              value={autoCashout}
              onChange={(e) => setAutoCashout(e.target.value)}
              disabled={running || !(ruleset.data?.allowAutoCashout ?? true)}
              className="h-10 w-28 rounded-md border border-input bg-white px-2 font-mono text-sm text-foreground tabular-nums shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            />
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <span className="text-sm text-foreground">
              Bet{' '}
              <span className="font-mono font-bold text-primary tabular-nums">{amount}</span>
            </span>
            {running && canManual ? (
              <Button variant="gradient" size="lg" onClick={cashout}>
                Cash Out{' '}
                <span className="font-mono tabular-nums">{multiplier.toFixed(2)}×</span>
              </Button>
            ) : (
              <Button variant="gradient" size="lg" disabled={running} onClick={start}>
                {running ? <Spinner size={18} /> : 'Place Bet'}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function FairnessPanel({
  session,
  result,
  variant,
  onClose,
}: {
  session: CrashSessionView;
  result: CrashRoundResult | null;
  variant: string;
  onClose: () => void;
}) {
  const [verified, setVerified] = useState<number | null>(null);
  const seed = result?.verification.seed;

  return (
    <div className="card-premium absolute inset-x-4 bottom-4 z-20 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Provably Fair
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <dl className="space-y-1 font-mono text-xs text-muted-foreground">
        <div className="truncate">Server seed hash: {session.fairness.serverSeedHash}</div>
        <div className="truncate">Client seed: {session.fairness.clientSeed}</div>
        <div>Nonce: {session.fairness.nonce}</div>
        {seed ? <div className="truncate">Last round seed: {seed}</div> : null}
      </dl>
      {seed ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => crashApi.verifyCrash(variant, seed).then((v) => setVerified(v.crashPoint))}
        >
          Verify crash point
        </Button>
      ) : null}
      {verified !== null ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Re-derived crash point: {verified.toFixed(2)}×{' '}
          {result && verified === result.crashPoint ? '✓ matches' : ''}
        </p>
      ) : null}
    </div>
  );
}
