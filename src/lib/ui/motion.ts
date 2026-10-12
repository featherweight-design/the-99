/**
 * The app's motion numbers for JS, the same ones `globals.css` declares on `html` (`--motion-delay`,
 * `--motion-duration`, `--motion-ease`), so a scroll or a WAAPI call cannot drift from the CSS.
 * `motion.test.ts` reads the stylesheet and fails when the two disagree.
 */

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress: x in [0, 1] to y. Solved for t
 * by Newton's method with a bisection fallback, the way browsers evaluate the timing function.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (sx(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

/** The curve's control points, exactly as `--motion-ease` spells them. */
export const MOTION_EASE_POINTS = [0.45, 0, 0.55, 1] as const;

export const MOTION = {
  /** The beat a movement the reader caused waits before it starts (`--motion-delay`). */
  delayMs: 100,
  /** A movement's length (`--motion-duration`), and the floor of a scroll's. */
  durationMs: 320,
  /** The longest a scroll runs, however far it travels. */
  scrollMaxMs: 700,
  /** Gentle in-out (`--motion-ease`): no hard start, no hard stop. */
  ease: cubicBezier(...MOTION_EASE_POINTS),
} as const;

/** `prefers-reduced-motion: reduce`; false where there is no window (the server). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}
