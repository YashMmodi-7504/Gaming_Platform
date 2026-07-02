'use client';

import { useEffect } from 'react';

/**
 * Root-level error boundary — catches errors thrown in the root layout itself
 * (where the normal error.tsx cannot render). Must supply its own <html>/<body>.
 * Kept dependency-free and inline-styled so it works even if styling failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          fontFamily: 'system-ui, sans-serif',
          color: '#1c1740',
          background: 'radial-gradient(120% 90% at 50% -10%, #e9d5ff, #dbeafe 45%, #f4f6fc 100%)',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: 34,
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            boxShadow: '0 20px 50px -18px rgba(124,58,237,.6)',
          }}
        >
          🎮
        </div>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Something went wrong</h1>
        <p style={{ color: '#5b567d', maxWidth: '24rem', textAlign: 'center', margin: '0 1rem' }}>
          The app hit an unexpected error. You can try again or reload.
        </p>
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button
            onClick={reset}
            style={{
              padding: '.6rem 1.4rem',
              border: 0,
              borderRadius: 999,
              cursor: 'pointer',
              color: '#fff',
              fontWeight: 700,
              background: 'linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)',
            }}
          >
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- last-resort boundary: a full page load is intentional */}
          <a
            href="/"
            style={{
              padding: '.6rem 1.4rem',
              borderRadius: 999,
              textDecoration: 'none',
              color: '#7c3aed',
              fontWeight: 700,
              border: '1px solid rgba(124,58,237,.3)',
            }}
          >
            Home
          </a>
        </div>
      </body>
    </html>
  );
}
