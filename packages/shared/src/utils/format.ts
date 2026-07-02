/**
 * Formatting helpers used across the platform.
 */

export const formatCurrency = (
  amount: number | string,
  currency = 'USD',
  locale = 'en-US',
): string => {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

export const formatNumber = (value: number, locale = 'en-US'): string =>
  new Intl.NumberFormat(locale).format(value);

export const formatCompactNumber = (value: number, locale = 'en-US'): string =>
  new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export const formatPercent = (value: number, fractionDigits = 1, locale = 'en-US'): string =>
  new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

export const truncate = (input: string, max: number, suffix = '…'): string =>
  input.length <= max ? input : input.slice(0, Math.max(0, max - suffix.length)) + suffix;

export const capitalize = (input: string): string =>
  input.length === 0 ? input : input.charAt(0).toUpperCase() + input.slice(1);

export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
