'use client';

import { Button, Spinner, cn } from '@gaming-platform/ui';
import { useMutation } from '@tanstack/react-query';
import { Receipt, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { sportsApi } from '@/lib/sports-api';
import { useSlipStore } from '@/stores/sports-slip-store';

const STAKES = [5, 10, 25, 100];

export function BetSlip() {
  const legs = useSlipStore((s) => s.legs);
  const remove = useSlipStore((s) => s.remove);
  const clear = useSlipStore((s) => s.clear);
  const [stake, setStake] = useState(10);

  const type = legs.length > 1 ? 'accumulator' : 'single';
  const combinedOdds = useMemo(
    () => (legs.length === 0 ? 0 : Math.round(legs.reduce((p, l) => p * l.odds, 1) * 100) / 100),
    [legs],
  );
  const potentialReturn = Math.round(stake * combinedOdds * 100) / 100;

  const place = useMutation({
    mutationFn: () =>
      sportsApi.place({
        type,
        stake: String(stake),
        selections: legs.map((l) => ({ matchId: l.matchId, marketId: l.marketId, selectionId: l.selectionId })),
      }),
    onSuccess: (slip) => {
      toast.success(`Bet placed · potential return ${slip.potentialReturn}`);
      clear();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Bet rejected'),
  });

  return (
    <aside className="card-premium glass-strong flex w-full flex-col overflow-hidden rounded-2xl shadow-elevated lg:w-80">
      <header className="relative flex items-center justify-between border-b border-black/10 bg-gradient-to-r from-primary/20 to-accent/10 px-4 py-3">
        <span className="flex items-center gap-2 font-display font-bold text-foreground">
          <Receipt className="h-4 w-4 text-accent" />
          Bet Slip
          {legs.length > 0 ? (
            <span className="rounded-full bg-accent/20 px-2 font-mono text-xs tabular-nums text-accent">
              {legs.length}
            </span>
          ) : null}
        </span>
        {legs.length > 0 ? (
          <button
            onClick={clear}
            className="text-muted-foreground transition-colors hover:text-destructive"
            aria-label="Clear slip"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      {legs.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Tap odds to add selections.
        </p>
      ) : (
        <>
          <div className="max-h-72 space-y-2 overflow-auto p-3">
            {legs.map((leg) => (
              <div key={leg.selectionId} className="rounded-xl glass p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{leg.selectionName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {leg.marketName} · {leg.matchName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-bold tabular-nums text-accent">
                      {leg.odds.toFixed(2)}
                    </span>
                    <button
                      onClick={() => remove(leg.selectionId)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Remove selection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-black/10 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="capitalize">
                {type === 'accumulator' ? `Accumulator (${legs.length})` : 'Single'}
              </span>
              <span className="font-mono tabular-nums">
                Total odds <span className="text-accent">{combinedOdds.toFixed(2)}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {STAKES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStake(s)}
                  className={cn(
                    'flex-1 rounded-lg border px-2 py-1.5 font-mono text-xs font-bold tabular-nums transition-all',
                    stake === s
                      ? 'border-accent bg-accent/15 text-accent shadow-glow-sm'
                      : 'glass text-foreground hover:border-accent/50',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              value={stake}
              onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
              className="h-10 w-full rounded-lg border border-input bg-background/60 px-3 font-mono text-sm tabular-nums backdrop-blur"
              aria-label="Stake"
            />

            <div className="flex items-center justify-between rounded-xl glass px-3 py-2 text-sm">
              <span className="text-muted-foreground">Potential return</span>
              <span className="font-mono text-lg font-extrabold tabular-nums text-gradient-gold text-glow">
                {potentialReturn.toFixed(2)}
              </span>
            </div>

            <Button
              variant="gradient"
              className="w-full shadow-glow-sm"
              disabled={place.isPending}
              onClick={() => place.mutate()}
            >
              {place.isPending ? <Spinner size={16} /> : 'Place Bet'}
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
