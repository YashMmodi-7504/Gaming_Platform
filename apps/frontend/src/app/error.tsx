'use client';

import { Button } from '@gaming-platform/ui';
import Link from 'next/link';
import { useEffect } from 'react';

import { logClientError } from '@/lib/monitoring';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError(error, 'route-error-boundary');
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="font-display text-7xl font-bold text-gradient">Oops</p>
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-md text-muted-foreground">
          An unexpected error occurred. You can try again or head back to the lobby.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="gradient" onClick={reset} className="sheen">
          Try again
        </Button>
        <Button asChild variant="glass">
          <Link href="/">Back to lobby</Link>
        </Button>
      </div>
    </div>
  );
}
