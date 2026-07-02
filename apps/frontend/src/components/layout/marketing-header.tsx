import { SiteHeader } from '@/components/layout/site-header';

/**
 * Public site header. Now an alias for the unified premium {@link SiteHeader}
 * so the marketing pages and the authenticated app share one gaming top bar.
 */
export function MarketingHeader() {
  return <SiteHeader />;
}
