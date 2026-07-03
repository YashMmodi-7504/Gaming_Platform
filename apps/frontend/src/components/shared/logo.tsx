import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { clientConfig } from '@/lib/config';

interface LogoProps {
  className?: string;
  href?: string;
  showText?: boolean;
}

export function Logo({ className, href = '/', showText = true }: LogoProps) {
  return (
    <Link href={href} className={cn('group flex items-center gap-2.5', className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-violet to-pink text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
        <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-pink opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-70" />
        <Gamepad2 className="relative h-5 w-5" />
      </span>
      {showText ? (
        <span className="hidden font-display text-lg font-bold tracking-tight min-[360px]:inline">
          <span className="text-foreground">{clientConfig.appName.split(' ')[0] ?? clientConfig.appName}</span>
          {clientConfig.appName.includes(' ') ? (
            <span className="text-gradient"> {clientConfig.appName.split(' ').slice(1).join(' ')}</span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}
