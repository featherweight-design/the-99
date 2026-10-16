/**
 * A press's hit of at least 44px on a coarse pointer, centred on its drawn box and drawn past it by a pseudo-element, so the row keeps
 * its 34px line. A fine pointer has no such need and gets none. Every class spelled whole so Tailwind sees it.
 */
export const TOUCH_HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:left-1/2 pointer-coarse:after:top-1/2 pointer-coarse:after:h-[max(44px,100%)] pointer-coarse:after:w-[max(44px,100%)] pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2 pointer-coarse:after:content-['']";
