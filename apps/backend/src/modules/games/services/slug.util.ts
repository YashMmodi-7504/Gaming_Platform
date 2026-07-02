import { BadRequestException } from '@nestjs/common';
import { slugify } from '@gaming-platform/shared';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 80;
}

export function normalizeSlug(input: string): string {
  return slugify(input);
}

export function assertValidSlug(slug: string): void {
  if (!isValidSlug(slug)) {
    throw new BadRequestException(
      'Slug must be lowercase alphanumeric words separated by single hyphens',
    );
  }
}

/**
 * Resolve a unique slug, appending `-2`, `-3`, … when `exists` reports a clash.
 */
export async function uniqueSlug(
  desired: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = normalizeSlug(desired);
  assertValidSlug(base);
  let candidate = base;
  let suffix = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
