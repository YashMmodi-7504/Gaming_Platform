'use client';

import { useEffect } from 'react';

import { logClientError } from '@/lib/monitoring';

/**
 * Registers the service worker in production only (kept off in dev/E2E to avoid
 * cache-staleness while iterating). Failures are swallowed via the monitor.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch((e) => logClientError(e, 'sw-register'));
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
