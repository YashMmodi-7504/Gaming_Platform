'use client';

import { useParams } from 'next/navigation';

import { DemoPlay } from '@/components/games/play/demo-play';
import { demoGameBySlug } from '@/lib/demo-games';

/**
 * Casino play route — launches a casino title directly into its correct engine
 * (card / roulette / slot / wheel) via the backend-free DemoPlay dispatcher.
 * No Games routing, no runtime dependency.
 */
export default function CasinoPlayPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const title = demoGameBySlug(slug)?.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return <DemoPlay slug={slug} title={title} lobbyHref="/casino" detailHref={`/casino/${slug}`} />;
}
