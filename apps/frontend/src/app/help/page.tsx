import { LifeBuoy } from 'lucide-react';
import Link from 'next/link';

import { Footer } from '@/components/layout/footer';
import { MarketingHeader } from '@/components/layout/marketing-header';

const FAQS = [
  {
    q: 'How do I create an account?',
    a: 'Tap Sign Up in the header, enter your email, choose a username and a password, and you’re in. You’ll land straight on your dashboard.',
  },
  {
    q: 'Is the platform free to try?',
    a: 'Yes. Every account starts in demo mode with free coins so you can explore the casino, games and sportsbook risk-free.',
  },
  {
    q: 'How do I sign in later?',
    a: 'Use the Login button in the header with the email and password you registered. You’ll return to your dashboard.',
  },
  {
    q: 'Which games are available?',
    a: 'Casino tables (Teen Patti, Blackjack, Baccarat, Roulette and more), slots, crash, dice, and a sportsbook — all reachable from your dashboard once you sign in.',
  },
  {
    q: 'Is my play fair?',
    a: 'Outcomes are provably fair and verifiable. Play responsibly — the platform is for adults 18 and over.',
  },
];

/**
 * Public help / FAQ page (Phase 1.1). Marketing-safe: no betting content and
 * accessible to guests.
 */
export default function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LifeBuoy className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Help &amp; FAQ
            </h1>
            <p className="text-sm text-muted-foreground">Answers to the most common questions.</p>
          </div>
        </div>

        <div className="space-y-3">
          {FAQS.map((item) => (
            <div key={item.q} className="card-premium p-5">
              <h2 className="font-display text-base font-bold text-foreground">{item.q}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-black/[0.07] bg-white/60 p-5 text-center backdrop-blur">
          <p className="text-sm text-muted-foreground">
            Ready to play?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>{' '}
            or{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              log in
            </Link>
            .
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
