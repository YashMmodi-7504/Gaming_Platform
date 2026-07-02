'use client';

import { useEffect } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

import { logClientError, reportVital } from '@/lib/monitoring';

/**
 * Reports Core Web Vitals (LCP, INP, CLS, FCP, TTFB) and installs global client
 * error handlers. Mounted once at the root. Zero UI; production-safe (see
 * lib/monitoring). Registered handlers are cleaned up on unmount.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    const handler = (m: { name: string; value: number; rating?: string; id: string }) =>
      reportVital({ name: m.name, value: m.value, rating: m.rating, id: m.id });

    onCLS(handler);
    onINP(handler);
    onLCP(handler);
    onFCP(handler);
    onTTFB(handler);

    const onError = (e: ErrorEvent) => logClientError(e.error ?? e.message, 'window.onerror');
    const onRejection = (e: PromiseRejectionEvent) => logClientError(e.reason, 'unhandledrejection');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
