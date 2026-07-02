'use client';

import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
}

const LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
const COLORS = [
  'bg-destructive',
  'bg-destructive',
  'bg-warning',
  'bg-success',
  'bg-success',
];

/** Lightweight client-side estimate; the server performs authoritative checks. */
function estimateScore(password: string): number {
  if (!password) return 0;
  const classes =
    (/[a-z]/.test(password) ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/\d/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (classes >= 3) score += 1;
  if (classes === 4 && password.length >= 12) score += 1;
  if (/^(.)\1+$/.test(password) || /0123|1234|abcd|qwer/i.test(password)) score = Math.min(score, 1);
  return Math.max(0, Math.min(4, score));
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const score = estimateScore(password);
  if (!password) return null;

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < score ? COLORS[score] : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Password strength: {LABELS[score]}</p>
    </div>
  );
}
