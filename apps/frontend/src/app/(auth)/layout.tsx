import { Coins, ShieldCheck, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/shared/logo';

const perks = [
  { icon: Zap, title: 'Instant play', desc: 'Jump into 1,200+ games in one click.' },
  { icon: ShieldCheck, title: 'Provably fair', desc: 'Verifiable outcomes on every round.' },
  { icon: Coins, title: 'Fast payouts', desc: 'Withdraw your winnings in minutes.' },
  { icon: Trophy, title: 'Live tournaments', desc: 'Compete for million-dollar prize pools.' },
];

/* Deterministic floating-chip decoration for the brand panel (GPU, aria-hidden,
   disabled under reduced motion). */
const CHIPS = [
  { left: '14%', top: '22%', size: 30, tone: 'from-gold to-warning', cls: 'animate-float' },
  { left: '78%', top: '30%', size: 22, tone: 'from-pink to-violet', cls: 'animate-float-slow' },
  { left: '24%', top: '70%', size: 26, tone: 'from-accent to-primary', cls: 'animate-float-slow' },
  { left: '70%', top: '76%', size: 18, tone: 'from-emerald to-accent', cls: 'animate-float' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-black/5 p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-20 top-10 h-96 w-96 animate-float-slow rounded-full bg-primary/25 blur-[130px]" />
          <div className="absolute bottom-0 right-0 h-80 w-80 animate-float rounded-full bg-accent/20 blur-[130px]" />
          <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          {CHIPS.map((c, i) => (
            <span
              key={i}
              aria-hidden
              className={`absolute rounded-full bg-gradient-to-br shadow-glow-sm ring-2 ring-white/50 ${c.tone} ${c.cls}`}
              style={{ left: c.left, top: c.top, width: c.size, height: c.size, animationDelay: `${i * 0.6}s` }}
            />
          ))}
        </div>
        <Logo />
        <div className="max-w-md space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-card/60 px-3 py-1 text-xs font-semibold text-emerald shadow-glow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" /> 12,480 players online now
            </span>
            <h2 className="font-display text-4xl font-bold leading-[1.1]">
              Your next big win <span className="text-gradient text-glow">starts here.</span>
            </h2>
            <p className="text-muted-foreground">
              Premium casino, crash, dice, roulette, live sports and high-stakes tournaments — all in
              one place.
            </p>
          </div>
          <ul className="space-y-4">
            {perks.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.title} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card/60 text-accent shadow-glow-sm backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Gaming Platform · 18+</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="card-premium p-7 sm:p-8">{children}</div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-4 hover:text-accent">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-accent">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
