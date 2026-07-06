'use client';

import { Spinner } from '@gaming-platform/ui';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const CrashTable = dynamic(() => import('@/components/crash/crash-table').then((m) => m.CrashTable), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner size={32} />
    </div>
  ),
});

const TITLES: Record<string, string> = {
  crash: 'Crash',
  'instant-crash': 'Instant Crash',
  'turbo-crash': 'Turbo Crash',
  'high-multiplier': 'High Multiplier',
  'low-volatility': 'Low Volatility',
  'high-volatility': 'High Volatility',
};

export default function CrashTablePage() {
  const params = useParams<{ variant: string }>();
  const variant = params.variant;
  const title =
    TITLES[variant] ?? variant.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return <CrashTable variant={variant} title={title} />;
}
