'use client';

import { Badge, Button, Spinner } from '@gaming-platform/ui';
import {
  ChevronLeft,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { DemoPlay } from '@/components/games/play/demo-play';
import { GameCanvas } from '@/components/runtime/game-canvas';
import { presetsFor } from '@/components/runtime/action-presets';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { useRuntime } from '@/hooks/use-runtime';

interface RuntimeHarnessProps {
  pluginKey: string;
  gameId?: string;
  title: string;
  /** Original game slug — lets the fallback pick the exact playable game. */
  slug?: string;
}

function LatencyBadge({ latency }: { latency: number | null }) {
  if (latency === null) {
    return (
      <Badge variant="outline" className="gap-1">
        <WifiOff className="h-3 w-3" /> —
      </Badge>
    );
  }
  const variant = latency < 80 ? 'success' : latency < 200 ? 'warning' : 'destructive';
  return (
    <Badge variant={variant} className="gap-1">
      <Wifi className="h-3 w-3" /> {latency}ms
    </Badge>
  );
}

export function RuntimeHarness({ pluginKey, gameId, title, slug }: RuntimeHarnessProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(containerRef);
  const [muted, setMuted] = useState(false);
  const runtime = useRuntime(pluginKey, gameId);

  const presets = presetsFor(pluginKey);
  const primary = presets.find((p) => p.primary) ?? presets[0];

  // Keyboard control: Space triggers the primary action.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.code === 'Space' && primary && runtime.status === 'ready') {
        e.preventDefault();
        runtime.sendAction(primary.type, primary.payload);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [primary, runtime]);

  const loading = runtime.status === 'creating' || runtime.status === 'connecting';

  // Runtime couldn't initialize (backend down / demo mode) — never dead-end with
  // "Failed to start runtime"; hand off to the always-playable client runtime.
  if (runtime.status === 'fallback' || runtime.status === 'error') {
    return <DemoPlay slug={slug ?? pluginKey} title={title} />;
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-black">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/games">
              <ChevronLeft className="h-4 w-4" /> Lobby
            </Link>
          </Button>
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="secondary">{pluginKey}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <LatencyBadge latency={runtime.latency} />
          <Button variant="ghost" size="icon" aria-label="Toggle sound" onClick={() => setMuted((m) => !m)}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Toggle fullscreen" onClick={toggle}>
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Surface */}
      <main className="relative flex-1 overflow-hidden p-4">
        {runtime.status === 'unauthenticated' ? (
          <CenterMessage title="Sign in to play" action={<Link href="/login">Sign in</Link>} />
        ) : (
          <>
            <GameCanvas
              pluginKey={pluginKey}
              snapshot={runtime.snapshot}
              lastEvent={runtime.lastEvent}
              events={runtime.events}
            />
            {loading ? <Overlay label="Loading game runtime…" /> : null}
            {runtime.status === 'reconnecting' ? (
              <Overlay label="Connection lost — reconnecting…" tone="warning" />
            ) : null}
          </>
        )}
      </main>

      {/* Controls */}
      {presets.length > 0 ? (
        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-border/60 bg-background/80 p-4 backdrop-blur">
          {presets.map((preset) => (
            <Button
              key={preset.type + preset.label}
              variant={preset.variant ?? 'default'}
              size="lg"
              disabled={runtime.status !== 'ready'}
              onClick={() => runtime.sendAction(preset.type, preset.payload)}
            >
              {preset.label}
            </Button>
          ))}
        </footer>
      ) : null}
    </div>
  );
}

function Overlay({ label, tone = 'default' }: { label: string; tone?: 'default' | 'warning' }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
      <Spinner size={32} />
      <p className={tone === 'warning' ? 'text-sm text-warning' : 'text-sm text-muted-foreground'}>
        {label}
      </p>
    </div>
  );
}

function CenterMessage({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {subtitle ? <p className="max-w-md text-sm text-muted-foreground">{subtitle}</p> : null}
      {action ? <div className="text-sm font-medium text-primary">{action}</div> : null}
    </div>
  );
}
