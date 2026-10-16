/**
 * A press's hit of at least 44px on a coarse pointer, centred on its drawn box and drawn past it by a pseudo-element, so the row keeps
 * its 34px line. A fine pointer has no such need and gets none. Every class spelled whole so Tailwind sees it.
 */
export const TOUCH_HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:left-1/2 pointer-coarse:after:top-1/2 pointer-coarse:after:h-[max(44px,100%)] pointer-coarse:after:w-[max(44px,100%)] pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2 pointer-coarse:after:content-['']";

/**
 * TOUCH_HIT for an inline trigger that sits among its neighbours on the row's one line (the `+N`, the availability marker, the
 * All view's `$`): 44px TALL, but only 3px past each side, so it never reaches into the next trigger. The tightest gap between
 * two of them is the name block's 6px, and two hits each taking half of it meet without overlapping; a 44px-wide hit around an
 * 11px figure reached 16px past it and covered its neighbour (#1916, Copilot round 1).
 */
export const TOUCH_HIT_INLINE =
  "relative pointer-coarse:after:absolute pointer-coarse:after:left-1/2 pointer-coarse:after:top-1/2 pointer-coarse:after:h-[max(44px,100%)] pointer-coarse:after:w-[calc(100%+6px)] pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2 pointer-coarse:after:content-['']";
