'use client';

import { Spinner } from '@gaming-platform/ui';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const DiceTable = dynamic(() => import('@/components/dice/dice-table').then((m) => m.DiceTable), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner size={32} />
    </div>
  ),
});

const TITLES: Record<string, string> = {
  'sic-bo': 'Sic Bo',
  'lucky-dice': 'Lucky Dice',
  'hi-lo': 'Hi-Lo Dice',
  'lucky-dice-deluxe': 'Lucky Dice Deluxe',
};

export default function DiceTablePage() {
  const params = useParams<{ variant: string }>();
  const variant = params.variant;
  const title =
    TITLES[variant] ?? variant.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return <DiceTable variant={variant} title={title} />;
}
