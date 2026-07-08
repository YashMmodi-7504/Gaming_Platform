'use client';

import { useEffect, useState } from 'react';

/** Mobile breakpoint — matches Tailwind's `md` (below 768px). */
const MOBILE_QUERY = '(max-width: 767px)';

/**
 * True on phone-sized viewports (< 768px). Used to CONDITIONALLY RENDER
 * dedicated mobile components instead of CSS-hiding desktop ones (Phase 1.5.2),
 * so mobile never mounts desktop rails and there is no duplicate DOM.
 *
 * SSR / first paint returns `false` (desktop) so the completed desktop layout is
 * never disturbed; on a phone it flips to `true` on mount. Most consumers here
 * are client-only (react-query shelves, lazy dashboard lobby), so this resolves
 * before real content paints.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}
