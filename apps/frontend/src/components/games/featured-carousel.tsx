'use client';

import { Button } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GameSummary } from '@gaming-platform/types';

import { GameCover } from './game-cover';

export function FeaturedCarousel({ games }: { games: GameSummary[] }) {
  const slides = games.slice(0, 5);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    // Respect reduced motion (WCAG 2.2.2 "Pause, Stop, Hide"): don't auto-advance
    // for users who prefer reduced motion — they drive the carousel manually.
    const reduced =
      typeof window !== 'undefined' &&
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('reduce-motion'));
    if (reduced) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const game = slides[index]!;

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-black/10 shadow-elevated md:h-96">
      <AnimatePresence mode="wait">
        <motion.div
          key={game.id}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <GameCover
            src={game.bannerUrl ?? game.thumbnailUrl}
            name={game.name}
            seed={game.id}
            hint={game.category?.slug}
            priority
            sizes="100vw"
            showTitle={false}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex h-full max-w-xl flex-col justify-end gap-3 p-6 md:p-12">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-black/10 bg-card/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> Featured
        </span>
        <h2 className="font-display text-3xl font-bold tracking-tight text-glow md:text-5xl">
          {game.name}
        </h2>
        <p className="text-sm text-muted-foreground">{game.provider?.name}</p>
        <div className="flex gap-3 pt-1">
          <Button asChild variant="gradient" size="lg" className="sheen">
            <Link href={`/games/${game.slug}`}>
              <Play className="h-4 w-4 fill-white" /> Play now
            </Link>
          </Button>
          <Button asChild variant="glass" size="lg">
            <Link href={`/games/${game.slug}`}>Details</Link>
          </Button>
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="absolute bottom-5 right-6 z-10 flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-7 bg-gradient-to-r from-primary to-neon' : 'w-2 bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
