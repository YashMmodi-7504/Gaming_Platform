import { cn } from '@gaming-platform/ui';
import type { LucideIcon } from 'lucide-react';

/**
 * Small elegant info card for the Deposit / Withdraw side rail (Phase 1.2.1).
 * Presentation only — reuses the shared card-premium surface and type scale.
 */
export function WalletInfoCard({
  icon: Icon,
  tone,
  title,
  desc,
  children,
}: {
  icon: LucideIcon;
  tone: string;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card-premium p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]',
            tone,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
          {desc ? <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
