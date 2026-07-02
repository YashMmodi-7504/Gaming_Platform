'use client';

import { motion } from 'framer-motion';
import type { RuntimeEventEntry } from '@/hooks/use-runtime';
import type { RuntimeStateSnapshot } from '@/lib/runtime-api';

interface GameCanvasProps {
  pluginKey: string;
  snapshot: RuntimeStateSnapshot | null;
  lastEvent: RuntimeEventEntry | null;
  events: RuntimeEventEntry[];
}

function readNumber(obj: Record<string, unknown> | undefined, key: string): number | null {
  const value = obj?.[key];
  return typeof value === 'number' ? value : null;
}

/**
 * Generic runtime render surface. It visualizes the authoritative state stream
 * for any engine; a real game ships its own richer canvas, but the framework
 * provides this universal view out of the box.
 */
export function GameCanvas({ pluginKey, snapshot, lastEvent, events }: GameCanvasProps) {
  const state = (snapshot?.state ?? {}) as Record<string, unknown>;
  const eventData = (lastEvent?.payload ?? {}) as Record<string, unknown>;

  // Crash gets a hero multiplier readout.
  const multiplier =
    pluginKey === 'crash-engine'
      ? readNumber(eventData, 'multiplier') ?? readNumber(state, 'multiplier')
      : null;

  return (
    <div className="grid h-full grid-rows-[1fr_auto] gap-4">
      <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary/40 to-card">
        {multiplier !== null ? (
          <motion.div
            key={multiplier}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <p className="text-6xl font-bold tabular-nums text-primary md:text-8xl">
              {multiplier.toFixed(2)}×
            </p>
            <p className="mt-2 text-sm uppercase tracking-widest text-muted-foreground">
              {String(state.phase ?? 'idle')}
            </p>
          </motion.div>
        ) : (
          <div className="max-h-full w-full overflow-auto p-6">
            <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {JSON.stringify(state, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="h-28 overflow-y-auto rounded-xl border border-border bg-card/60 p-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Event stream
        </p>
        <ul className="space-y-1 font-mono text-xs">
          {events.length === 0 ? (
            <li className="text-muted-foreground">Waiting for events…</li>
          ) : (
            events.map((e, i) => (
              <li key={`${e.ts}-${i}`} className="truncate">
                <span className="text-accent">{e.type}</span>{' '}
                <span className="text-muted-foreground">{JSON.stringify(e.payload)}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
