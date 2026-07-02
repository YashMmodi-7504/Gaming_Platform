'use client';

import { motion } from 'framer-motion';
import { Activity, Sparkles, TrendingUp, Users } from 'lucide-react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { SectionHeading } from '@/components/marketing/landing-sections';
import { SocialFeed } from '@/components/social/social-feed';
import { friends } from '@/lib/ecosystem-data';

export default function FeedPage() {
  const fr = friends();
  const online = fr.filter((f) => f.online).length;

  return (
    <div className="relative space-y-8">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-40" />
      <div className="bg-aurora pointer-events-none absolute inset-0 -z-10 opacity-40" />

      {/* Header ------------------------------------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl border border-black/10 glass-strong p-6 sm:p-8">
        <div className="sheen pointer-events-none absolute inset-0" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-card/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur">
            <Activity className="h-3.5 w-3.5" /> Live activity
          </span>
          <h1 className="mt-3 text-gradient font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Social Feed
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Everything happening across your friends and the community — unlocks, level-ups,
            tournament wins and events, as they happen.
          </p>
        </div>
        <div className="relative mt-6 grid gap-3 sm:max-w-lg sm:grid-cols-2">
          <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/15 text-emerald shadow-glow-sm">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Friends online</p>
              <p className="font-display text-2xl font-bold tabular-nums text-gradient">
                <AnimatedNumber value={online} />
              </p>
            </div>
          </div>
          <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-glow-sm">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rounds today</p>
              <p className="font-display text-2xl font-bold tabular-nums text-gradient">
                <AnimatedNumber value={1_000_000} live />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feed -------------------------------------------------------------- */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <SectionHeading icon={<Sparkles className="h-5 w-5 text-primary" />} title="Latest Activity" />
          <SocialFeed />
        </motion.section>

        {/* Online friends rail */}
        <aside className="space-y-4">
          <SectionHeading icon={<Users className="h-5 w-5 text-emerald" />} title="Online Now" />
          <div className="card-premium space-y-1 p-3">
            {fr.filter((f) => f.online).slice(0, 8).map((f) => (
              <div key={f.seed} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-black/[0.03]">
                <span className="relative">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald/15 text-xs font-bold text-emerald">
                    {f.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald ring-2 ring-card" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                    <span className="text-sm leading-none">{f.flag}</span>
                    {f.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{f.status}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
