'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Cinematic page transition. `template.tsx` re-mounts on every navigation, so a
 * fresh enter animation plays on each route change — a smooth cross-fade instead
 * of a hard cut. We animate OPACITY only (no transform/filter on the wrapper) so
 * we never create a containing block that would break `position: fixed`
 * descendants (backgrounds, HUD, modals). Respects prefers-reduced-motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
