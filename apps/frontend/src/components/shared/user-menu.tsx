'use client';

import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@gaming-platform/ui';
import {
  BarChart3,
  Crown,
  Gift,
  ListChecks,
  LogOut,
  Mail,
  Medal,
  Palette,
  Rss,
  Settings,
  ShoppingBag,
  Store,
  Trophy,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth-store';

const GROUPS: { label: string; items: { href: string; label: string; icon: typeof User }[] }[] = [
  {
    label: 'Account',
    items: [
      { href: '/profile', label: 'Profile', icon: User },
      { href: '/avatar', label: 'Avatar Studio', icon: Palette },
      { href: '/wallet', label: 'Wallet', icon: Wallet },
    ],
  },
  {
    label: 'Progress',
    items: [
      { href: '/daily', label: 'Daily Rewards', icon: Gift },
      { href: '/missions', label: 'Missions', icon: ListChecks },
      { href: '/battle-pass', label: 'Battle Pass', icon: Crown },
      { href: '/trophies', label: 'Trophy Room', icon: Trophy },
      { href: '/stats', label: 'Statistics', icon: BarChart3 },
    ],
  },
  {
    label: 'Shop',
    items: [
      { href: '/store', label: 'Cosmetic Store', icon: ShoppingBag },
      { href: '/marketplace', label: 'Marketplace', icon: Store },
    ],
  },
  {
    label: 'Social',
    items: [
      { href: '/community', label: 'Community', icon: Users },
      { href: '/clans', label: 'Clans', icon: Users },
      { href: '/friends', label: 'Friends', icon: Users },
      { href: '/feed', label: 'Feed', icon: Rss },
      { href: '/mailbox', label: 'Mailbox', icon: Mail },
      { href: '/hall-of-fame', label: 'Hall of Fame', icon: Medal },
    ],
  },
];

export function UserMenu() {
  const router = useRouter();
  const { user, isAuthenticated, clearSession } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore — clear the local session regardless.
    } finally {
      clearSession();
      router.push('/');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild size="sm" variant="gradient">
          <Link href="/register">Sign up</Link>
        </Button>
      </div>
    );
  }

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none ring-ring focus-visible:ring-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[80vh] w-60 overflow-y-auto">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{user.username}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        {GROUPS.map((group) => (
          <div key={group.label}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {group.label}
            </DropdownMenuLabel>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" /> {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleLogout()}>
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
