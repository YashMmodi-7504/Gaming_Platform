'use client';

import { Spinner } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

import { gamesApi } from '@/lib/games-api';

const RuntimeHarness = dynamic(
  () => import('@/components/runtime/runtime-harness').then((m) => m.RuntimeHarness),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Spinner size={32} />
      </div>
    ),
  },
);

const ENGINE_KEYS = [
  'dice-engine',
  'crash-engine',
  'roulette-engine',
  'card-engine',
  'lottery-engine',
  'sports-engine',
];

export default function PlayPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const isEngine = ENGINE_KEYS.includes(slug);

  const game = useQuery({
    queryKey: ['game', slug],
    queryFn: () => gamesApi.detail(slug),
    enabled: !isEngine,
    retry: false,
  });

  if (isEngine) {
    return <RuntimeHarness pluginKey={slug} title={slug.replace('-engine', '')} />;
  }

  if (game.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const pluginKey = game.data?.launch.launcherKey ?? 'dice-engine';
  return (
    <RuntimeHarness pluginKey={pluginKey} gameId={game.data?.id} title={game.data?.name ?? slug} />
  );
}
