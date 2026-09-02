// The crab — host of the character layer (richness handoff §The one big idea).
// Geometry is a verbatim port of design/design_handoff_the99_richness/crab.svg;
// only the hardcoded hexes are swapped for tokens (the brass strokes become
// --accent, the panel fill becomes --surface).
//
// Takes a numeric `size` rather than a variant union, unlike the identity marks
// in ../marks.tsx. Those compose px-sized diamonds and text, where a uniform
// scale would yield fractional pixels; the crab is one fixed path set in a
// single viewBox, so scaling is a plain uniform transform.

import type { CSSProperties } from "react";

const VIEWBOX_W = 160;
const VIEWBOX_H = 110;

export function Crab({
  size = 96,
  bobSeconds = 3,
  className,
}: {
  size?: number;
  bobSeconds?: number;
  className?: string;
}) {
  const height = (size * VIEWBOX_H) / VIEWBOX_W;
  const bob = bobSeconds > 0;

  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      width={size}
      height={height}
      className={[bob ? "anim-bob" : "", className].filter(Boolean).join(" ")}
      style={bob ? ({ "--bob-duration": `${bobSeconds}s` } as CSSProperties) : undefined}
    >
      {/* Legs — three segments per side */}
      <g
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M30 60 L 13 70 L 6 88" />
        <path d="M34 72 L 19 84 L 14 101" />
        <path d="M43 81 L 33 93 L 30 105" />
        <path d="M130 60 L 147 70 L 154 88" />
        <path d="M126 72 L 141 84 L 146 101" />
        <path d="M117 81 L 127 93 L 130 105" />
      </g>
      {/* Carapace */}
      <path
        d="M80 24 C 114 24, 136 40, 134 60 C 132 80, 110 90, 80 90 C 50 90, 28 80, 26 60 C 24 40, 46 24, 80 24 Z"
        fill="var(--surface)"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Pincers */}
      <g
        fill="var(--surface)"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M54 76 C 36 72, 22 82, 27 95 C 31 105, 49 109, 59 101 C 66 96, 65 84, 58 79 Z" />
        <path d="M59 101 L 49 88" fill="none" />
        <path d="M106 76 C 124 72, 138 82, 133 95 C 129 105, 111 109, 101 101 C 94 96, 95 84, 102 79 Z" />
        <path d="M101 101 L 111 88" fill="none" />
      </g>
      {/* Eyes on stalks, with deadpan half-lids */}
      <ellipse cx="58" cy="18" rx="4.5" ry="6.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="3" />
      <ellipse cx="102" cy="18" rx="4.5" ry="6.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="3" />
      <circle cx="57" cy="20" r="2" fill="var(--accent)" />
      <circle cx="101" cy="20" r="2" fill="var(--accent)" />
      <path d="M52 14 L 63 13" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M97 13 L 108 14" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Flat mouth */}
      <path d="M72 62 L 88 62" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
