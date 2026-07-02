import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  label?: string;
}

export function Spinner({ size = 20, label = 'Loading', className, ...props }: SpinnerProps) {
  return (
    <div role="status" aria-live="polite" className={cn('inline-flex', className)} {...props}>
      <Loader2 className="animate-spin text-muted-foreground" style={{ width: size, height: size }} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
