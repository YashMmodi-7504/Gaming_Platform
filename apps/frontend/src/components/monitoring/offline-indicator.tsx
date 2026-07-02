'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Non-blocking connectivity banner. Appears when the browser goes offline so
 * players understand why live data paused. Purely client-side, cleaned up on
 * unmount, and hidden when back online.
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline ? (
        <motion.div
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed left-1/2 top-3 z-[120] -translate-x-1/2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-semibold text-destructive shadow-elevated backdrop-blur"
        >
          <span className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" /> Connection lost — reconnecting…
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
