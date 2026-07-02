'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { toast } from 'sonner';

import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';

export function FavoriteButton({ gameId, className }: { gameId: string; className?: string }) {
  const router = useRouter();
  const { isFavorite, toggle, isAuthenticated } = useFavorites();
  const active = isFavorite(gameId);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Sign in to save favorites');
      router.push('/login');
      return;
    }
    toggle.mutate(gameId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={active}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur transition-colors hover:bg-background',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4', active ? 'fill-primary text-primary' : 'text-foreground')} />
    </button>
  );
}
