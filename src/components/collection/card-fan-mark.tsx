// Card-fan brand mark for the Issue Inspector's empty-filter state.
//
// Three FILLED cards, back to front, so each one covers the one behind it. The
// handoff draws them as CSS boxes with a fill and a border apiece (Issue
// Inspector README §Empty-filter state, mock :315); the first SVG drew the
// strokes alone, which left every overlap visible and read as outlines crossing
// each other (prod walk 2026-09-28, item 4). Fills and strokes are the same
// tokens the other two shipped fans use (`games-panel.tsx`, `decks-zero.tsx`),
// because six themes redefine the palette and a hex would only suit one.

const BACK = { fill: "var(--elevated)", stroke: "var(--border-strong)" };
const MIDDLE = { fill: "var(--surface-raised)", stroke: "var(--border-dashed)" };
const FRONT = {
  fill: "color-mix(in srgb, var(--accent) 14%, var(--surface))",
  stroke: "var(--accent)",
};

// 52px on the phone and 56px from `md`, the mock's two sizes (:333 and :315).
export function CardFanMark() {
  return (
    <svg
      className="h-[52px] w-[52px] md:h-[56px] md:w-[56px]"
      viewBox="0 0 56 56"
      role="img"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="10"
        y="14"
        width="16"
        height="24"
        rx="2"
        transform="rotate(-14 18 26)"
        style={BACK}
        strokeWidth="1.5"
      />
      <rect x="20" y="12" width="16" height="24" rx="2" style={MIDDLE} strokeWidth="1.5" />
      <rect
        x="30"
        y="14"
        width="16"
        height="24"
        rx="2"
        transform="rotate(14 38 26)"
        style={FRONT}
        strokeWidth="1.5"
      />
    </svg>
  );
}
