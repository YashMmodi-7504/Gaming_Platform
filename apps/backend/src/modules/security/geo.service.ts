import { Injectable } from '@nestjs/common';

import type { RequestMeta } from '../../common/security/request-meta';

export interface GeoLocation {
  countryCode: string | null;
  city: string | null;
}

/**
 * Resolves an approximate geo location for a request.
 *
 * The default implementation trusts geo headers populated by an upstream proxy
 * (Cloudflare `cf-ipcountry`, or Nginx GeoIP via `x-geo-country` / `x-geo-city`).
 * It is intentionally a thin, swappable seam: a MaxMind GeoLite2 reader can be
 * dropped in here without touching any caller.
 */
@Injectable()
export class GeoService {
  resolve(meta: RequestMeta): GeoLocation {
    return { countryCode: meta.countryCode, city: meta.city };
  }

  /** Human-readable location label, or null when nothing is known. */
  label(meta: RequestMeta): string | null {
    const { countryCode, city } = this.resolve(meta);
    if (city && countryCode) return `${city}, ${countryCode}`;
    return city ?? countryCode ?? null;
  }
}
