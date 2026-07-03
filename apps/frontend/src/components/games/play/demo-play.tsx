'use client';

import { Badge, Button, Spinner } from '@gaming-platform/ui';
import { ChevronLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ComponentType } from 'react';

import { type CardProto, demoExperienceFor } from '@/lib/demo-games';

/**
 * Backend-free play dispatcher.
 *
 * Every casino/game slug resolves to a self-contained prototype (card, crash,
 * dice, roulette) or the animated Slot demo — all client-side, all using the
 * local demo wallet. NOTHING here touches the runtime websocket or the card API,
 * so a game can NEVER show "Failed to start runtime" in demo mode.
 */

const spinner = (
  <div className="flex h-full items-center justify-center">
    <Spinner size={32} />
  </div>
);

const loading = () => spinner;

const CARD_GAMES: Record<CardProto, ComponentType> = {
  'teen-patti': dynamic(() => import('@/components/games/prototype/cards/teen-patti').then((m) => m.TeenPattiGame), { ssr: false, loading }),
  'andar-bahar': dynamic(() => import('@/components/games/prototype/cards/andar-bahar').then((m) => m.AndarBaharGame), { ssr: false, loading }),
  'dragon-tiger': dynamic(() => import('@/components/games/prototype/cards/dragon-tiger').then((m) => m.DragonTigerGame), { ssr: false, loading }),
  baccarat: dynamic(() => import('@/components/games/prototype/cards/baccarat').then((m) => m.BaccaratGame), { ssr: false, loading }),
  blackjack: dynamic(() => import('@/components/games/prototype/cards/blackjack').then((m) => m.BlackjackGame), { ssr: false, loading }),
  'casino-war': dynamic(() => import('@/components/games/prototype/cards/casino-war').then((m) => m.CasinoWarGame), { ssr: false, loading }),
  'lucky-7': dynamic(() => import('@/components/games/prototype/cards/lucky-7').then((m) => m.Lucky7Game), { ssr: false, loading }),
};

const CrashGame = dynamic(() => import('@/components/games/prototype/crash-game').then((m) => m.CrashGame), { ssr: false, loading });
const DiceGame = dynamic(() => import('@/components/games/prototype/dice-game').then((m) => m.DiceGame), { ssr: false, loading });
const RouletteGame = dynamic(() => import('@/components/games/prototype/roulette-game').then((m) => m.RouletteGame), { ssr: false, loading });
const SlotDemo = dynamic(() => import('@/components/games/slot/slot-demo').then((m) => m.SlotDemo), { ssr: false, loading });

export function DemoPlay({ slug, title }: { slug: string; title: string }) {
  const exp = demoExperienceFor(slug);

  // The Slot demo ships its own full-screen chrome (header + Lobby link).
  if (exp.kind === 'slot') {
    return <SlotDemo slug={slug} title={title} />;
  }

  const Game: ComponentType =
    exp.kind === 'card' ? CARD_GAMES[exp.game]
      : exp.kind === 'crash' ? CrashGame
        : exp.kind === 'dice' ? DiceGame
          : RouletteGame;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      <header className="glass-strong flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/casino">
            <ChevronLeft className="h-4 w-4" /> Lobby
          </Link>
        </Button>
        <span className="flex items-center gap-2 font-display font-semibold text-foreground">
          {title}
          <Badge variant="secondary">Demo</Badge>
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/games/${slug}`}>Details</Link>
        </Button>
      </header>
      <main className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-4xl">
          <Game />
        </div>
      </main>
    </div>
  );
}
