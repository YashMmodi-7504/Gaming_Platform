'use client';

import { Button, cn } from '@gaming-platform/ui';
import { Gift } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { MobileNav } from '@/components/layout/mobile-nav';
import { BalancePill } from '@/components/shared/balance-pill';
import { LevelPill } from '@/components/shared/level-pill';
import { Logo } from '@/components/shared/logo';
import { primaryNav } from '@/components/shared/navigation';
import { NotificationsMenu } from '@/components/shared/notifications-menu';
import { SearchCommand } from '@/components/shared/search-command';
import { UserMenu } from '@/components/shared/user-menu';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Premium gaming top bar shared by the marketing site and the authenticated
 * app. Sticky, glassy, light. Replaces the old enterprise sidebar for players.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-white/85 shadow-[0_6px_24px_-18px_hsl(230_50%_40%/0.35)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-1 px-3 sm:gap-2 sm:px-6">
        <div className="flex items-center lg:hidden">
          <MobileNav items={primaryNav} />
        </div>

        <Logo />

        {/*
          Single-row primary nav. No horizontal scroll: every item is always
          visible (icon-only below 1728px, icon+label on wide desktops), so a
          1920px desktop shows the full labelled set with room to spare.
        */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex min-[1728px]:ml-3 min-[1728px]:gap-1">
          {primaryNav.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'group relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary/50 min-[1728px]:px-3',
                  active
                    ? 'bg-primary/[0.06] text-foreground'
                    : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    active ? 'text-accent' : 'text-muted-foreground group-hover:text-accent',
                  )}
                />
                <span className="hidden min-[1728px]:inline">{item.label}</span>
                <span
                  className={cn(
                    'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-primary to-neon transition-all',
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchCommand />
          {isAuthenticated ? (
            <>
              <Button asChild variant="gold" size="sm" className="hidden md:inline-flex">
                <Link href="/vip">
                  <Gift className="h-4 w-4" /> VIP
                </Link>
              </Button>
              <LevelPill />
              <BalancePill />
              <NotificationsMenu />
              <UserMenu />
            </>
          ) : (
            <>
              <NotificationsMenu />
              <Button asChild size="lg" variant="gradient" className="hidden sm:inline-flex">
                <Link href="/register">Play now</Link>
              </Button>
              <UserMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
