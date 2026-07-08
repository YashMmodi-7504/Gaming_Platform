'use client';

import { cn } from '@gaming-platform/ui';
import { Gamepad2, Home, Spade, TrendingUp, User, Wallet, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Stake-inspired fixed mobile bottom navigation (Phase 1.4.1).
 *
 * Mobile only (`md:hidden`, < 768px) — desktop, laptop and tablet keep the
 * existing top navigation untouched. Reuses the app's routing (next/link) and
 * design system; no navigation logic is duplicated. A soft, rounded, blurred
 * card that always stays visible, with a safe-area inset for iPhone home bars.
 */

const ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Casino', href: '/casino', icon: Spade },
  { label: 'Games', href: '/games', icon: Gamepad2 },
  { label: 'Sports', href: '/sportsbook', icon: TrendingUp },
  { label: 'Wallet', href: '/wallet', icon: Wallet },
  { label: 'Profile', href: '/profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-3 mb-3 flex items-stretch justify-around rounded-2xl border border-black/[0.06] bg-white/95 shadow-[0_8px_30px_-8px_rgba(20,20,60,0.28)] backdrop-blur-sm">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="relative flex h-6 w-6 items-center justify-center">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -top-2 h-1 w-1 rounded-full bg-primary transition-opacity',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </span>
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
