import { Button } from '@gaming-platform/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/shared/logo';

/**
 * Immersive game layout: minimal chrome, full-bleed play surface. Used for the
 * in-game experience.
 */
export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(120%_100%_at_50%_-10%,hsl(263_90%_95%)_0%,hsl(210_80%_96%)_45%,hsl(222_40%_98%)_100%)]">
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-background/85 px-4 backdrop-blur-md">
        <Button asChild variant="ghost" size="sm">
          <Link href="/games">
            <ChevronLeft className="h-4 w-4" /> Lobby
          </Link>
        </Button>
        <Logo showText={false} href="/" />
        <div className="w-9" />
      </header>
      <main className="relative flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
