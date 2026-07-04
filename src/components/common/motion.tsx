"use client";

import { MotionConfig, motion } from "motion/react";

/*
 * Motion primitives for the app-wide entrance choreography.
 * Contract (docs/design-system.md → Motion):
 * - transform/opacity only, no layout-affecting properties
 * - enter-only stagger reveals; no exit animations, no route transitions
 * - `MotionProvider` sets reducedMotion="user" so every motion component
 *   honors prefers-reduced-motion automatically
 */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Delay for the nth element of a cascade, capped so long pages stay snappy. */
export function staggerDelay(index: number, step = 0.045, cap = 0.32): number {
  return Math.min(index * step, cap);
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Fade + 8px rise on mount. Wrap each block of a page in a `Reveal` with an
 * increasing `delay` (use `staggerDelay`) to get the cascade.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={{ opacity: 0, y: 8 }}
      transition={{ delay, duration: 0.45, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
