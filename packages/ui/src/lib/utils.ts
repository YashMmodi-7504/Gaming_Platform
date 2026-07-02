import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names intelligently, de-duplicating conflicting
 * utilities (the canonical shadcn/ui helper).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
