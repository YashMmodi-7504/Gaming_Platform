'use client';

import { Spinner } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

import { DemoPlay } from '@/components/games/play/demo-play';
import { demoGameBySlug } from '@/lib/demo-games';
import { gamesApi } from '@/lib/games-api';

const spinner = (
  <div className="flex h-full items-center justify-center">
    <Spinner size={32} />
  </div>
);

// Real server-authoritative runtime — used ONLY when a live backend returns a
// launcher for this game. In demo mode (no backend) we never reach it.
const RuntimeHarness = dynamic(
  () => import('@/components/runtime/runtime-harness').then((m) => m.RuntimeHarness),
  { ssr: false, loading: () => spinner },
);

const ENGINE_KEYS = [
  'dice-engine',
  'crash-engine',
  'roulette-engine',
  'card-engine',
  'lottery-engine',
  'sports-engine',
];

function titleize(slug: string): string {
  return slug.replace('-engine', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PlayPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const isEngineKey = ENGINE_KEYS.includes(slug);

  // Only queried for real game slugs. retry:false → falls through to the demo
  // experience immediately when the backend is absent.
  const game = useQuery({
    queryKey: ['game', slug],
    queryFn: () => gamesApi.detail(slug),
    enabled: !isEngineKey,
    retry: false,
  });

  // Prefer the real runtime ONLY when a backend actually provides a launcher.
  if (game.data?.launch.launcherKey) {
    return (
      <RuntimeHarness
        pluginKey={game.data.launch.launcherKey}
        gameId={game.data.id}
        title={game.data.name}
        slug={slug}
      />
    );
  }

  // Brief spinner only while a real query is in flight (never for engine keys).
  if (!isEngineKey && game.isLoading) {
    return spinner;
  }

  // Demo-safe, fully offline, always playable — no runtime, no websocket.
  const title = game.data?.name ?? demoGameBySlug(slug)?.name ?? titleize(slug);
  return <DemoPlay slug={slug} title={title} />;
}
