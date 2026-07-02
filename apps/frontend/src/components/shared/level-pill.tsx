'use client';

import Link from 'next/link';

import { usePlayerProfile } from '@/stores/player-profile';

/** Compact level + XP chip shown in the top bar; links to the profile. */
export function LevelPill() {
  const level = usePlayerProfile((s) => s.level);
  const xp = usePlayerProfile((s) => s.xp);
  const xpToNext = usePlayerProfile((s) => s.xpToNext);
  const pct = Math.min(100, Math.round((xp / xpToNext) * 100));

  return (
    <Link
      href="/profile"
      title={`Level ${level} — ${pct}% to next`}
      className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/70 py-1 pl-1 pr-3 shadow-soft backdrop-blur transition-transform hover:-translate-y-0.5 sm:flex"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-[11px] font-bold text-white shadow-glow-sm">
        {level}
      </span>
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-black/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-neon"
          style={{ width: `${pct}%` }}
        />
      </span>
    </Link>
  );
}
