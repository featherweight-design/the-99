// The lock's padlock, at the two sizes the first-run handoff draws it.
//
// `rail` is the 12x14 glyph: the rail well's foot, the desktop page line and the
// locked step cards. `bracket` is the 9x11 glyph in the phone's tab-bar bracket.
// Shackle and body are measured off the handoff's box model (design table
// first-run-locked-nav.md 1b.2 and 4.11) and drawn as strokes inset by half the
// stroke width, so the ink lands inside the stated box.
//
// Decorative everywhere it is drawn: every locked thing already carries its state
// in words.

type PadlockProps = {
  size?: "rail" | "bracket";
  stroke: string;
  className?: string;
};

export function Padlock({ size = "rail", stroke, className }: PadlockProps) {
  if (size === "bracket") {
    return (
      <svg
        width="9"
        height="11"
        viewBox="0 0 9 11"
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={className}
      >
        {/* Body 9 x 6.5, radius 2, at the foot of the box. */}
        <rect x="0.6" y="5.1" width="7.8" height="5.3" rx="1.4" />
        {/* Shackle 5 x 6 at left 2, top 0, open at the foot. */}
        <path d="M2.6 5.4V2.5a1.9 1.9 0 0 1 3.8 0v2.9" />
      </svg>
    );
  }
  return (
    <svg
      width="12"
      height="14"
      viewBox="0 0 12 14"
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Body 12 x 8.5, radius 3, at the foot of the box. */}
      <rect x="0.75" y="6.25" width="10.5" height="7" rx="2.25" />
      {/* Shackle 7 x 7.5 at left 2.5, top 0, open at the foot. */}
      <path d="M3.25 6.75V3.5a2.75 2.75 0 0 1 5.5 0v3.25" />
    </svg>
  );
}
