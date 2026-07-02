'use client';

import { Badge, Button, Spinner, cn } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, RotateCcw, ShieldCheck, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PlayingCard } from '@/components/card/playing-card';
import {
  cardApi,
  type CardRoundResult,
  type CardRuleSet,
  type CardSessionView,
} from '@/lib/card-api';
import { useAuthStore } from '@/stores/auth-store';

const CHIPS = [1, 5, 25, 100];
const CHIP_COLORS: Record<number, string> = {
  1: 'bg-slate-500',
  5: 'bg-red-600',
  25: 'bg-green-600',
  100: 'bg-purple-600',
};

interface BlackjackUi {
  player: string[];
  dealerUp: string[];
  value?: number;
  awaiting: boolean;
}

export function CardTable({ variant, title }: { variant: string; title: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialized = useAuthStore((s) => s.initialized);

  const ruleset = useQuery<CardRuleSet>({
    queryKey: ['card-variant', variant],
    queryFn: () => cardApi.variant(variant),
  });

  const [session, setSession] = useState<CardSessionView | null>(null);
  const [chip, setChip] = useState(5);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CardRoundResult | null>(null);
  const [history, setHistory] = useState<CardRoundResult[]>([]);
  const [bj, setBj] = useState<BlackjackUi | null>(null);
  const [busy, setBusy] = useState(false);
  const [showFairness, setShowFairness] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!initialized || !isAuthenticated || startedRef.current) return;
    startedRef.current = true;
    cardApi
      .createSession({ variantKey: variant, mode: 'demo' })
      .then((r) => setSession(r.session))
      .catch(() => toast.error('Unable to start table'));
  }, [variant, isAuthenticated, initialized]);

  const allBets = [...(ruleset.data?.bets ?? []), ...(ruleset.data?.sideBets ?? [])];
  const totalStake = Object.values(bets).reduce((a, b) => a + b, 0);
  const interactive = ruleset.data?.interactive ?? false;

  const addBet = (key: string) => setBets((b) => ({ ...b, [key]: (b[key] ?? 0) + chip }));
  const clearBets = () => setBets({});

  const finalize = useCallback((r: CardRoundResult) => {
    setResult(r);
    setHistory((h) => [r, ...h].slice(0, 15));
    setBets({});
    setBj(null);
  }, []);

  const placedBets = () =>
    Object.entries(bets)
      .filter(([, amt]) => amt > 0)
      .map(([key, amt]) => ({ key, amount: String(amt) }));

  const deal = async () => {
    if (!session) return;
    const wager = placedBets();
    if (wager.length === 0) {
      toast.info('Place a bet first');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      if (interactive) {
        const dealt = await cardApi.bjDeal(session.sessionId, wager);
        setBj({ player: dealt.player, dealerUp: dealt.dealerUp, awaiting: true });
      } else {
        finalize(await cardApi.playRound(session.sessionId, wager));
      }
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Round failed');
    } finally {
      setBusy(false);
    }
  };

  const hit = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const h = await cardApi.bjHit(session.sessionId);
      if (h.busted && h.result) finalize(h.result);
      else setBj((prev) => (prev ? { ...prev, player: h.player, value: h.value } : prev));
    } finally {
      setBusy(false);
    }
  };

  const stand = async () => {
    if (!session) return;
    setBusy(true);
    try {
      finalize(await cardApi.bjStand(session.sessionId));
    } finally {
      setBusy(false);
    }
  };

  if (initialized && !isAuthenticated) {
    return (
      <Centered>
        <p className="text-lg font-semibold">Sign in to play</p>
        <Button asChild variant="gradient">
          <Link href="/login">Sign in</Link>
        </Button>
      </Centered>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-emerald-100 via-white to-emerald-50 bg-grid">
      {/* Header */}
      <header className="glass-strong flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/casino">
              <ChevronLeft className="h-4 w-4" /> Lobby
            </Link>
          </Button>
          <span className="font-display font-semibold text-foreground">{title}</span>
          <Badge variant="secondary">{ruleset.data?.evaluationMode ?? '…'}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowFairness((v) => !v)}>
          <ShieldCheck className="h-4 w-4" /> Provably Fair
        </Button>
      </header>

      {/* History strip */}
      <div className="glass flex items-center gap-1.5 overflow-x-auto border-b border-border/40 px-4 py-2">
        <span className="text-xs text-muted-foreground">Recent:</span>
        {history.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          history.map((r, i) => (
            <span
              key={`${r.roundId}-${i}`}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-foreground"
            >
              {r.winners.join('/')}
            </span>
          ))
        )}
      </div>

      {/* Table felt */}
      <main className="relative flex-1 overflow-auto p-6">
        {ruleset.isLoading || !session ? (
          <Centered>
            <Spinner size={28} />
          </Centered>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Dealer / sides */}
            {interactive ? (
              <BlackjackArea bj={bj} result={result} />
            ) : (
              <ResultArea result={result} sides={ruleset.data?.sides ?? []} />
            )}

            {/* Bet spots */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allBets.map((bet) => (
                <button
                  key={bet.key}
                  onClick={() => addBet(bet.key)}
                  disabled={busy || bj?.awaiting}
                  className={cn(
                    'card-premium flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-glow',
                    (bets[bet.key] ?? 0) > 0 && 'border-primary bg-primary/10',
                  )}
                >
                  <span className="text-sm font-semibold text-foreground">{bet.label}</span>
                  <span className="text-xs text-muted-foreground">{bet.payout}×</span>
                  {(bets[bet.key] ?? 0) > 0 ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                      {bets[bet.key]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Winner banner */}
        <AnimatePresence>
          {result ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center"
            >
              <div className="glass-strong flex items-center gap-2 rounded-full px-5 py-2 shadow-glow ring-1 ring-gold/40">
                <Trophy className="h-5 w-5 text-gold" />
                <span className="font-bold text-foreground">
                  {result.winners.join(' / ')}
                  {Number(result.settlement.totalWin) > 0
                    ? ` · won ${result.settlement.totalWin}`
                    : ' · no win'}
                </span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Fairness panel */}
        {showFairness && session ? (
          <FairnessPanel session={session} result={result} onClose={() => setShowFairness(false)} />
        ) : null}
      </main>

      {/* Controls */}
      <footer className="glass-strong shrink-0 space-y-3 border-t border-border/60 p-4">
        <div className="flex items-center justify-center gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => setChip(c)}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ring-2 transition-all',
                CHIP_COLORS[c],
                chip === c ? 'scale-110 ring-white' : 'ring-transparent opacity-80',
              )}
            >
              {c}
            </button>
          ))}
          <div className="ml-3 text-sm text-foreground">
            Stake: <span className="font-bold font-mono tabular-nums">{totalStake}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          {bj?.awaiting ? (
            <>
              <Button variant="gradient" size="lg" disabled={busy} onClick={() => void hit()}>
                Hit
              </Button>
              <Button variant="outline" size="lg" disabled={busy} onClick={() => void stand()}>
                Stand
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="lg" disabled={busy || totalStake === 0} onClick={clearBets}>
                <RotateCcw className="h-4 w-4" /> Clear
              </Button>
              <Button variant="gradient" size="lg" disabled={busy || totalStake === 0} onClick={() => void deal()}>
                {busy ? <Spinner size={18} /> : interactive ? 'Deal' : 'Play'}
              </Button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

function ResultArea({ result, sides }: { result: CardRoundResult | null; sides: string[] }) {
  if (!result) {
    return (
      <div className="card-premium flex min-h-[140px] items-center justify-center rounded-2xl text-sm text-muted-foreground">
        Place your bets and deal.
      </div>
    );
  }
  const entries = Object.entries(result.hands);
  return (
    <div className="space-y-4">
      {entries.map(([side, cards]) => (
        <div
          key={side}
          className={cn(
            'card-premium rounded-2xl p-4',
            result.winners.includes(side) && 'border-primary ring-2 ring-primary/30 bg-primary/5',
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-foreground">{side}</span>
            {result.winners.includes(side) ? <Badge variant="success">Winner</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {cards.map((code, i) => (
              <PlayingCard key={`${side}-${i}`} code={code} index={i} />
            ))}
          </div>
        </div>
      ))}
      {sides.length === 0 ? null : null}
    </div>
  );
}

function BlackjackArea({ bj, result }: { bj: BlackjackUi | null; result: CardRoundResult | null }) {
  const dealerCards = result?.hands.dealer ?? bj?.dealerUp ?? [];
  const playerCards = result?.hands.player ?? bj?.player ?? [];
  return (
    <div className="space-y-4">
      <div className="card-premium rounded-2xl p-4">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-foreground">Dealer</p>
        <div className="flex flex-wrap gap-2">
          {dealerCards.map((c, i) => (
            <PlayingCard key={`d-${i}`} code={c} index={i} />
          ))}
          {!result && bj ? <PlayingCard faceDown index={1} /> : null}
        </div>
      </div>
      <div
        className={cn(
          'card-premium rounded-2xl p-4',
          result?.winners.includes('player') && 'border-primary ring-2 ring-primary/30 bg-primary/5',
        )}
      >
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          You {bj?.value ? `· ${bj.value}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          {playerCards.map((c, i) => (
            <PlayingCard key={`p-${i}`} code={c} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FairnessPanel({
  session,
  result,
  onClose,
}: {
  session: CardSessionView;
  result: CardRoundResult | null;
  onClose: () => void;
}) {
  const [deck, setDeck] = useState<string[] | null>(null);
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
        {seed ? <div className="truncate">Last round seed: {seed}</div> : null}
      </dl>
      {seed ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => cardApi.verifyShuffle(seed).then((v) => setDeck(v.shuffledDeck.slice(0, 13)))}
        >
          Verify deck order
        </Button>
      ) : null}
      {deck ? (
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">{deck.join(' ')} …</p>
      ) : null}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">{children}</div>
  );
}
