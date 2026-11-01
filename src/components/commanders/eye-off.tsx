// The eye with a slash through it: Hide's one glyph (design_handoff_the99_hide_commander, `EYE_OFF`), drawn by
// the commander page's note and Hide line and by the list row's control. Its own module, importing nothing, so
// the row (`commander-row.tsx`, imported where no server action may be) can draw it too.

import type { CSSProperties } from "react";

export function EyeOff({ size, style, className }: { size: number; style?: CSSProperties; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flex: "none", ...style }}
    >
      <path d="M10.7 5.1A10.7 10.7 0 0 1 21.9 11.7a1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.4 2.5" />
      <path d="M14.1 14.2a3 3 0 0 1-4.2-4.2" />
      <path d="M17.5 17.5A10.8 10.8 0 0 1 2.1 12.3a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.4-5.1" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
