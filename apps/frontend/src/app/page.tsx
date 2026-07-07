'use client';

import { Button } from '@gaming-platform/ui';
import { Coins, Gamepad2, LogIn, ShieldCheck, Sparkles, Trophy, UserPlus, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Footer } from '@/components/layout/footer';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { useAuthStore } from '@/stores/auth-store';

const FEATURES = [
  { icon: Zap, title: 'Instant play', desc: 'Jump into hundreds of games in a single click — no downloads.' },
  { icon: ShieldCheck, title: 'Provably fair', desc: 'Verifiable, transparent outcomes on every round.' },
  { icon: Coins, title: 'Fast & secure', desc: 'Bank-grade security and quick, hassle-free payouts.' },
  { icon: Trophy, title: 'Live tournaments', desc: 'Compete for leaderboards and seasonal prize pools.' },
];

/**
 * Public landing page (Phase 1.1). Marketing only — no casino, games,
 * sportsbook, wallet or betting content. Authenticated players are sent to
 * their dashboard; guests are invited to log in or sign up.
 */
export default function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && isAuthenticated) router.replace('/dashboard');
  }, [initialized, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto flex min-h-[78vh] w-full max-w-4xl flex-col items-center justify-center px-4 py-20 text-center">
          <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet to-pink text-white shadow-glow ring-1 ring-white/40">
            <Gamepad2 className="h-8 w-8" />
          </span>

          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white/70 px-4 py-1.5 text-xs font-semibold text-foreground shadow-soft backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-violet" /> A premium gaming universe
          </span>

          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-[4.25rem]">
            Welcome to the <span className="text-gradient">Gaming Platform</span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Casino, live tables, crash, dice, roulette, sports and high-stakes tournaments — all in
            one elegant, provably-fair platform. Create your account to start playing.
          </p>

          <div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="xl" variant="gradient" className="sheen w-full sm:w-auto">
              <Link href="/signup">
                <UserPlus className="h-5 w-5" /> Sign Up
              </Link>
            </Button>
            <Button asChild size="xl" variant="glass" className="w-full sm:w-auto">
              <Link href="/login">
                <LogIn className="h-5 w-5" /> Login
              </Link>
            </Button>
          </div>
        </section>

        {/* Features (marketing — no betting content) */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card-premium p-6">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-foreground">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Responsible gaming notice */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-16">
          <div className="rounded-2xl border border-black/[0.07] bg-white/60 p-5 text-center text-sm text-muted-foreground backdrop-blur">
            <p className="font-semibold text-foreground">Play responsibly · 18+</p>
            <p className="mx-auto mt-1 max-w-2xl">
              Gaming should be fun, never a way to make money. Set limits, take breaks, and only play
              with what you can afford. If gambling stops being enjoyable, seek support. This
              platform is intended for adults aged 18 and over.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
