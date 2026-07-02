'use client';

import { Spinner } from '@gaming-platform/ui';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const CardTable = dynamic(() => import('@/components/card/card-table').then((m) => m.CardTable), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gradient-to-b from-emerald-100 via-white to-emerald-50">
      <Spinner size={32} />
    </div>
  ),
});

const TITLES: Record<string, string> = {
  'dragon-tiger': 'Dragon Tiger',
  baccarat: 'Baccarat',
  blackjack: 'Blackjack',
  'andar-bahar': 'Andar Bahar',
  'lucky-7': 'Lucky 7',
  'teen-patti': 'Teen Patti',
  poker: 'Poker',
  'texas-holdem': "Texas Hold'em",
};

export default function CasinoTablePage() {
  const params = useParams<{ variant: string }>();
  const variant = params.variant;
  const title =
    TITLES[variant] ?? variant.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return <CardTable variant={variant} title={title} />;
}
