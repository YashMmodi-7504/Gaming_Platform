'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { ArrowLeftRight, MessageSquare, Square, Trophy } from 'lucide-react';

import type { Match } from '@/lib/sports-api';
import { commentary, timeline, type TimelineEvent } from '@/lib/sports-mock';

function EventIcon({ type }: { type: TimelineEvent['type'] }) {
  const cls = 'h-3.5 w-3.5';
  if (type === 'goal' || type === 'point') return <Trophy className={cn(cls, 'text-gold')} />;
  if (type === 'card') return <Square className={cn(cls, 'text-warning')} />;
  if (type === 'sub') return <ArrowLeftRight className={cn(cls, 'text-accent')} />;
  return <MessageSquare className={cls} />;
}

/**
 * Match detail sidebar-style content: a mini timeline strip (icons positioned
 * along the match clock) plus a scrollable commentary feed. Presentation only.
 */
export function CommentaryFeed({ match }: { match: Match }) {
  const lines = commentary(match);
  const events = timeline(match);
  if (lines.length === 0 && events.length === 0) return null;

  const maxMinute = events.reduce((m, e) => Math.max(m, e.minute), 1) || 1;

  return (
    <div className="card-premium rounded-2xl p-4">
      <p className="mb-3 font-display text-sm font-bold text-foreground">Match Timeline</p>

      {/* Mini timeline strip */}
      {events.length > 0 ? (
        <div className="relative mb-4 h-8">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-black/10" />
          {events.map((e, i) => {
            const pct = Math.max(2, Math.min(98, (e.minute / maxMinute) * 100));
            return (
              <motion.span
                key={`${e.minute}-${e.type}-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 20 }}
                title={`${e.minute}' ${e.text}`}
                style={{ left: `${pct}%` }}
                className={cn(
                  'glass absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ring-1',
                  e.team === 'home' ? 'ring-primary/50' : 'ring-pink/50',
                )}
              >
                <EventIcon type={e.type} />
              </motion.span>
            );
          })}
        </div>
      ) : null}

      {/* Commentary feed (scrollable) */}
      {lines.length > 0 ? (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {lines
            .slice()
            .reverse()
            .map((l, i) => (
              <motion.div
                key={`${l.minute}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass flex items-start gap-2 rounded-xl px-3 py-2"
              >
                <span className="mt-0.5 shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-primary">
                  {l.minute}
                </span>
                <span className="text-xs leading-relaxed text-foreground">{l.text}</span>
              </motion.div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
