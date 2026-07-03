'use client';

import { useParams } from 'next/navigation';

import { DemoPlay } from '@/components/games/play/demo-play';

const TITLES: Record<string, string> = {
  'dragon-tiger': 'Dragon Tiger',
  baccarat: 'Baccarat',
  blackjack: 'Blackjack',
  'andar-bahar': 'Andar Bahar',
  'lucky-7': 'Lucky 7',
  'teen-patti': 'Teen Patti',
  poker: 'Poker',
  'texas-holdem': "Texas Hold'em",
  'casino-war': 'Casino War',
};

/**
 * Live-dealer table route. The old data-driven CardTable required a backend
 * session; PPP-7 routes it through the same backend-free DemoPlay dispatcher so
 * every table launches offline (no "Unable to start table").
 */
export default function CasinoTablePage() {
  const params = useParams<{ variant: string }>();
  const variant = params.variant;
  const title =
    TITLES[variant] ?? variant.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return <DemoPlay slug={variant} title={title} />;
}
