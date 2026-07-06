'use client';

import { Spinner } from '@gaming-platform/ui';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const RouletteTable = dynamic(
  () => import('@/components/roulette/roulette-table').then((m) => m.RouletteTable),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Spinner size={32} />
      </div>
    ),
  },
);

const TITLES: Record<string, string> = {
  european: 'European Roulette',
  american: 'American Roulette',
  french: 'French Roulette',
  'single-zero': 'Single Zero Roulette',
  'double-zero': 'Double Zero Roulette',
  'french-en-prison': 'French Roulette (En Prison)',
};

export default function RouletteTablePage() {
  const params = useParams<{ variant: string }>();
  const variant = params.variant;
  const title =
    TITLES[variant] ?? variant.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return <RouletteTable variant={variant} title={title} />;
}
