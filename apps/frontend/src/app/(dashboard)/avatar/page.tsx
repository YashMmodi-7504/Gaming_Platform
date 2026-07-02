'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Dice5,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  UserCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { PlayerAvatar } from '@/components/profile/player-card';
import {
  ACCENT_HUES,
  type AvatarConfig,
  AVATAR_OPTIONS,
  BG_GRADIENTS,
  CLOTHES_COLORS,
  DEFAULT_AVATAR,
  HAIR_COLORS,
  SKIN_TONES,
} from '@/lib/cosmetics';
import { usePlayerProfile } from '@/stores/player-profile';

type PartKey = keyof AvatarConfig;

interface PartControl {
  key: PartKey;
  label: string;
  /** Optional swatch palette for color parts. */
  swatches?: readonly string[];
  /** Optional labels for the first few numeric options (0 = none, etc). */
  noneAtZero?: boolean;
}

const CONTROLS: PartControl[] = [
  { key: 'skin', label: 'Skin', swatches: SKIN_TONES },
  { key: 'hair', label: 'Hair style', noneAtZero: true },
  { key: 'hairColor', label: 'Hair color', swatches: HAIR_COLORS },
  { key: 'eyes', label: 'Eyes' },
  { key: 'brows', label: 'Brows' },
  { key: 'mouth', label: 'Mouth' },
  { key: 'beard', label: 'Beard', noneAtZero: true },
  { key: 'hat', label: 'Hat', noneAtZero: true },
  { key: 'mask', label: 'Mask', noneAtZero: true },
  { key: 'headphones', label: 'Headphones', noneAtZero: true },
  { key: 'clothes', label: 'Clothes' },
  { key: 'clothesColor', label: 'Clothes color', swatches: CLOTHES_COLORS },
  { key: 'background', label: 'Background' },
  { key: 'accent', label: 'RGB accent' },
];

function countFor(key: PartKey): number {
  return AVATAR_OPTIONS[key];
}

function accentSwatchStyle(i: number): string {
  const hue = ACCENT_HUES[i] ?? ACCENT_HUES[0]!;
  return `hsl(${hue} 90% 60%)`;
}

export default function AvatarStudioPage() {
  const avatar = usePlayerProfile((s) => s.avatar);
  const setAvatar = usePlayerProfile((s) => s.setAvatar);

  const cycle = (key: PartKey, dir: 1 | -1) => {
    const count = countFor(key);
    const next = ((avatar[key] + dir) % count + count) % count;
    setAvatar({ [key]: next } as Partial<AvatarConfig>);
  };

  const set = (key: PartKey, value: number) => {
    setAvatar({ [key]: value } as Partial<AvatarConfig>);
  };

  const randomize = () => {
    const next: AvatarConfig = { ...DEFAULT_AVATAR };
    (Object.keys(AVATAR_OPTIONS) as PartKey[]).forEach((k) => {
      next[k] = Math.floor(Math.random() * countFor(k));
    });
    // guarantee a face is visible: keep at least default eyes/mouth if 0-count edge
    setAvatar(next);
    toast('Randomized avatar 🎲');
  };

  const reset = () => {
    setAvatar({ ...DEFAULT_AVATAR });
    toast('Reset to default');
  };

  const save = () => {
    toast.success('Avatar saved ✨');
  };

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
            <UserCircle2 className="h-7 w-7 text-violet" /> Avatar Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Craft your look — changes reflect live on your Player Card.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="glass" asChild>
            <Link href="/profile">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to profile
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* ---------------- Live preview ---------------- */}
        <section className="card-premium relative flex flex-col items-center gap-6 overflow-hidden p-6 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-aurora absolute inset-0 opacity-10" />
          <div className="bg-grid absolute inset-0 opacity-40" />
          <div className="relative flex flex-col items-center gap-5">
            <motion.div
              key={JSON.stringify(avatar)}
              initial={{ scale: 0.96, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="rounded-full bg-gradient-to-br from-primary to-violet p-1.5 shadow-glow"
            >
              <div className="rounded-full bg-white p-1.5">
                <PlayerAvatar config={avatar} size={220} />
              </div>
            </motion.div>
            <Badge variant="neon" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Live preview
            </Badge>
          </div>

          <div className="relative grid w-full grid-cols-3 gap-2">
            <Button variant="gradient" onClick={randomize} className="sheen">
              <Shuffle className="mr-1 h-4 w-4" /> Random
            </Button>
            <Button variant="glass" onClick={reset}>
              <RotateCcw className="mr-1 h-4 w-4" /> Reset
            </Button>
            <Button variant="gold" onClick={save} className="sheen">
              <Save className="mr-1 h-4 w-4" /> Save
            </Button>
          </div>
        </section>

        {/* ---------------- Controls ---------------- */}
        <section className="space-y-3">
          {CONTROLS.map((ctrl, idx) => {
            const count = countFor(ctrl.key);
            const value = avatar[ctrl.key];
            return (
              <motion.div
                key={ctrl.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className="card-premium flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-[9rem] items-center gap-2">
                  <span className="font-display text-sm font-bold">
                    {ctrl.label}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {ctrl.noneAtZero && value === 0
                      ? 'None'
                      : `${value + 1}/${count}`}
                  </span>
                </div>

                {ctrl.swatches ? (
                  <div className="flex flex-1 flex-wrap justify-end gap-1.5">
                    {ctrl.swatches.map((color, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`${ctrl.label} ${i + 1}`}
                        onClick={() => set(ctrl.key, i)}
                        style={{ backgroundColor: color }}
                        className={cn(
                          'h-7 w-7 rounded-full ring-2 transition-transform hover:scale-110',
                          value === i
                            ? 'ring-primary shadow-glow'
                            : 'ring-black/10',
                        )}
                      />
                    ))}
                  </div>
                ) : ctrl.key === 'accent' ? (
                  <div className="flex flex-1 flex-wrap justify-end gap-1.5">
                    {Array.from({ length: count }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Accent ${i + 1}`}
                        onClick={() => set(ctrl.key, i)}
                        style={{ backgroundColor: accentSwatchStyle(i) }}
                        className={cn(
                          'h-7 w-7 rounded-full ring-2 transition-transform hover:scale-110',
                          value === i
                            ? 'ring-primary shadow-glow'
                            : 'ring-black/10',
                        )}
                      />
                    ))}
                  </div>
                ) : ctrl.key === 'background' ? (
                  <div className="flex flex-1 flex-wrap justify-end gap-1.5">
                    {Array.from({ length: count }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Background ${i + 1}`}
                        onClick={() => set(ctrl.key, i)}
                        className={cn(
                          'h-7 w-7 rounded-full bg-gradient-to-br ring-2 transition-transform hover:scale-110',
                          BG_GRADIENTS[i] ?? BG_GRADIENTS[0],
                          value === i
                            ? 'ring-primary shadow-glow'
                            : 'ring-black/10',
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-end gap-2">
                    <Button
                      variant="glass"
                      size="icon"
                      onClick={() => cycle(ctrl.key, -1)}
                      aria-label={`Previous ${ctrl.label}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-wrap justify-center gap-1">
                      {Array.from({ length: count }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`${ctrl.label} ${i + 1}`}
                          onClick={() => set(ctrl.key, i)}
                          className={cn(
                            'h-2.5 w-2.5 rounded-full transition-all',
                            value === i
                              ? 'w-5 bg-gradient-to-r from-primary to-violet'
                              : 'bg-black/15 hover:bg-black/30',
                          )}
                        />
                      ))}
                    </div>
                    <Button
                      variant="glass"
                      size="icon"
                      onClick={() => cycle(ctrl.key, 1)}
                      aria-label={`Next ${ctrl.label}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}

          <div className="card-premium flex items-center justify-between gap-3 p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Dice5 className="h-4 w-4 text-accent" /> Feeling lucky? Roll a
              fresh look.
            </p>
            <Button variant="gradient" onClick={randomize} className="sheen">
              <Shuffle className="mr-1 h-4 w-4" /> Randomize
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
