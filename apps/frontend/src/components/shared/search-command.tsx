'use client';

import { cn } from '@gaming-platform/ui';
import { CircleDot, Dice5, Gamepad2, Rocket, Search, Spade, Trophy, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const QUICK = [
  { label: 'Crash', href: '/crash', icon: Rocket },
  { label: 'Dice', href: '/dice', icon: Dice5 },
  { label: 'Roulette', href: '/roulette', icon: CircleDot },
  { label: 'Casino', href: '/casino', icon: Spade },
  { label: 'All games', href: '/games', icon: Gamepad2 },
  { label: 'Tournaments', href: '/tournaments', icon: Trophy },
];

/** Lightweight search launcher (button + overlay). Opens with click or ⌘/Ctrl-K. */
export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) go(`/games?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <button
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground sm:h-9 sm:w-auto sm:gap-2 sm:px-3"
      >
        <Search className="h-[18px] w-[18px]" />
        <span className="hidden text-sm sm:inline">Search</span>
        <kbd className="ml-1 hidden rounded border border-black/10 bg-black/5 px-1.5 text-[10px] font-semibold text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/20 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass-strong w-full max-w-lg overflow-hidden rounded-2xl shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submit} className="flex items-center gap-3 border-b border-black/5 px-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search games, tables, tournaments…"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
              </button>
            </form>
            <div className="p-3">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick links
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => go(item.href)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary',
                      )}
                    >
                      <Icon className="h-4 w-4 text-accent" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
