'use client';

import { cn } from '@gaming-platform/ui';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { type Ambience, sound, useSound } from '@/lib/sound';

function ambienceFor(path: string): Ambience {
  if (path.startsWith('/casino') || path.startsWith('/roulette') || path.startsWith('/wallet') || path.startsWith('/rewards') || path.startsWith('/daily') || path.startsWith('/missions') || path.startsWith('/store') || path.startsWith('/marketplace'))
    return 'casino';
  if (path.startsWith('/crash')) return 'crash';
  if (path.startsWith('/sportsbook')) return 'sports';
  if (path.startsWith('/leaderboards') || path.startsWith('/tournaments') || path.startsWith('/profile') || path.startsWith('/battle-pass') || path.startsWith('/community') || path.startsWith('/trophies') || path.startsWith('/hall-of-fame') || path.startsWith('/clans'))
    return 'esports';
  if (path.startsWith('/games') || path.startsWith('/dice') || path.startsWith('/arcade') || path.startsWith('/discover'))
    return 'arcade';
  return 'default';
}

/**
 * Floating sound control (bottom-right). Master mute, volume slider, and an
 * ambient-music toggle. Also plays a soft click SFX on every button/link press
 * site-wide (a gesture-gated microinteraction). Muted by default.
 */
export function SoundControl() {
  const { muted, volume, ambientOn, toggleMute, setVolume, toggleAmbient } = useSound();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Route-aware ambience: morph the pad to each category's mood.
  useEffect(() => {
    sound.setAmbience(ambienceFor(pathname ?? '/'));
  }, [pathname]);

  // Global click SFX — one delegated listener, no per-button wiring.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest('button, a, [role="button"]');
      if (el) sound.play('click');
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open ? (
        <div className="glass-strong w-60 rounded-2xl p-4 shadow-elevated">
          <p className="mb-3 font-display text-sm font-bold">Sound</p>
          <button
            onClick={toggleAmbient}
            className={cn(
              'mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              ambientOn ? 'bg-primary/10 text-primary' : 'bg-black/[0.04] text-muted-foreground hover:text-foreground',
            )}
          >
            <Music className="h-4 w-4" /> Ambient music {ambientOn ? 'on' : 'off'}
          </button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <VolumeX className="h-4 w-4" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 accent-primary"
              aria-label="Volume"
            />
            <Volume2 className="h-4 w-4" />
          </label>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (muted) toggleMute();
        }}
        aria-label="Sound settings"
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-foreground shadow-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:text-primary hover:shadow-glow-sm"
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5 text-primary" />}
        {!muted ? <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/20" /> : null}
      </button>
    </div>
  );
}
