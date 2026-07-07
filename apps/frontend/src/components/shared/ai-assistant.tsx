'use client';

import { Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bot,
  Gift,
  ListChecks,
  Rocket,
  Sparkles,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { friends, liveEvents } from '@/lib/ecosystem-data';
import { useAuthStore } from '@/stores/auth-store';
import { useMissions } from '@/stores/missions';
import { usePlayerProfile } from '@/stores/player-profile';

interface Suggestion {
  icon: LucideIcon;
  tone: string;
  text: string;
  cta: string;
  href: string;
}

/**
 * Floating AI Game Assistant. Reads the player's live state (missions, daily
 * reward, achievements, friends, events) and surfaces deterministic, helpful
 * suggestions — the "always something to do" nudge. Purely client-side.
 */
export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const profile = usePlayerProfile();
  const missions = useMissions();
  const reduce = useReducedMotion();
  // Player-only feature — never on the public landing / auth pages (Phase 1.1).
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => setMounted(true), []);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!mounted) return [];
    const out: Suggestion[] = [];

    if (!profile.dailyClaimedToday) {
      out.push({ icon: Gift, tone: 'text-gold', text: 'Your daily reward is ready to claim.', cta: 'Claim', href: '/daily' });
    }
    const claimable = [...missions.daily, ...missions.weekly].find((m) => !m.claimed && m.progress >= m.target);
    const nearly = [...missions.daily, ...missions.weekly].find((m) => !m.claimed && m.progress < m.target && m.target - m.progress <= 2);
    if (claimable) {
      out.push({ icon: ListChecks, tone: 'text-emerald', text: `Mission "${claimable.title}" is complete — claim ${claimable.coins.toLocaleString('en-US')} coins.`, cta: 'Claim', href: '/missions' });
    } else if (nearly) {
      out.push({ icon: ListChecks, tone: 'text-primary', text: `You're ${nearly.target - nearly.progress} from finishing "${nearly.title}".`, cta: 'Play', href: '/missions' });
    }
    const almost = profile.achievements.find((a) => !a.unlocked);
    if (almost) {
      out.push({ icon: Trophy, tone: 'text-violet', text: `Achievement "${almost.name}" is close — ${almost.desc.toLowerCase()}.`, cta: 'View', href: '/profile' });
    }
    const online = friends().filter((f) => f.online);
    if (online[0]) {
      out.push({ icon: Users, tone: 'text-accent', text: `${online[0].name} and ${online.length - 1} friends are online.`, cta: 'Friends', href: '/friends' });
    }
    const live = liveEvents().find((e) => e.status === 'live');
    if (live) {
      out.push({ icon: Sparkles, tone: 'text-pink', text: `${live.name} is live — ${live.reward}.`, cta: 'Join', href: live.href });
    }
    out.push({ icon: Rocket, tone: 'text-primary', text: 'Recommended for you: try a Crash run and aim for 2×.', cta: 'Play', href: '/crash' });

    return out.slice(0, 6);
  }, [mounted, profile.dailyClaimedToday, profile.achievements, missions.daily, missions.weekly]);

  // Nova proactively greets once with the most relevant nudge.
  useEffect(() => {
    if (!mounted || open) return;
    const first = suggestions[0];
    if (!first) return;
    const t = window.setTimeout(() => setGreeting(first.text), 2600);
    const h = window.setTimeout(() => setGreeting(null), 11000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(h);
    };
  }, [mounted, open, suggestions]);

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {/* Nova proactive greeting bubble */}
      <AnimatePresence>
        {greeting && !open ? (
          <motion.button
            key="greeting"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => {
              setGreeting(null);
              setOpen(true);
            }}
            className="glass-strong max-w-[15rem] rounded-2xl rounded-bl-sm p-3 text-left shadow-elevated"
          >
            <p className="text-xs font-semibold text-primary">Nova</p>
            <p className="mt-0.5 text-xs text-foreground/90">{greeting}</p>
          </motion.button>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="glass-strong w-[19rem] overflow-hidden rounded-2xl shadow-elevated"
          >
            <div className="flex items-center gap-2 border-b border-black/5 bg-gradient-to-r from-primary/10 to-accent/10 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet text-white shadow-glow-sm">
                <Bot className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-bold">Nova · AI Assistant</p>
                <p className="text-[11px] text-muted-foreground">What to do next</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="max-h-[22rem] space-y-2 overflow-y-auto p-3">
              {suggestions.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card-premium flex items-start gap-2.5 p-2.5"
                  >
                    <span className={cn('mt-0.5 shrink-0', s.tone)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="flex-1 text-xs text-foreground/90">{s.text}</p>
                    <Button asChild size="sm" variant="glass" className="h-7 shrink-0 px-2 text-xs" onClick={() => setOpen(false)}>
                      <Link href={s.href}>{s.cta}</Link>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => {
          setGreeting(null);
          setOpen((o) => !o);
        }}
        aria-label="AI assistant"
        animate={reduce ? {} : { y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.08, y: -3 }}
        whileTap={{ scale: 0.94 }}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-white shadow-glow"
      >
        <Bot className="h-6 w-6" />
        {suggestions.length > 0 && !open ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-gold-foreground shadow">
            {suggestions.length}
          </span>
        ) : null}
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/25" />
      </motion.button>
    </div>
  );
}
