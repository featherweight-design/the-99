// Card-fan brand mark for the Issue Inspector's empty-filter state.
//
// Three FILLED cards, back to front, so each one covers the one behind. The handoff draws
// them as CSS boxes (Issue Inspector README §Empty-filter state; mock `.dc.html` :315 desktop,
// :333 phone): 26×38 cards, radius 5, a 1.5px border, fanned at -16°/0°/+16° and 10px apart,
// the whole mark at 0.9 opacity. The first SVG drew 16×24 rects as strokes alone, which left
// every overlap visible and read as outlines crossing each other (prod walk 2026-09-28,
// item 4).
//
// Geometry is the mock's, transcribed: a CSS box's border sits INSIDE its edge and an SVG
// stroke straddles it, so each rect is inset by half the stroke (0.75px) to paint the same
// outer 26×38. `rotate(a 28 28) translate(dx 0)` is CSS's `rotate(a) translateX(dx)` about
// the box's centre. One 56 viewBox serves both sizes; at 52px it lands within 0.2px of the
// phone mock's 24×35.
//
// Fills lighten back to front, as the mock's do, in tokens rather than its hexes because six
// themes redefine the palette: the back card is `--elevated`, and the two in front of it take
// the accent in 7% and 14%, which on the default theme reads within a few points of the mock.

const CARD = { x: 15.75, y: 9.75, width: 24.5, height: 36.5, rx: 4.25, strokeWidth: 1.5 };

const BACK = { fill: "var(--elevated)", stroke: "var(--border-dashed)" };
const MIDDLE = {
  fill: "color-mix(in srgb, var(--accent) 7%, var(--elevated))",
  stroke: "color-mix(in srgb, var(--accent) 12%, var(--border-dashed))",
};
const FRONT = { fill: "color-mix(in srgb, var(--accent) 14%, var(--elevated))", stroke: "var(--accent)" };

export function CardFanMark() {
  return (
    <svg
      // 52px on the phone and 56px from `md`, with the mock's 18/20px below it: the host's
      // flex gap already gives 10, so the margin carries the rest.
      className="mb-[8px] h-[52px] w-[52px] opacity-90 md:mb-[10px] md:h-[56px] md:w-[56px]"
      viewBox="0 0 56 56"
      role="img"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect {...CARD} transform="rotate(-16 28 28) translate(-10 0)" style={BACK} />
      <rect {...CARD} style={MIDDLE} />
      <rect {...CARD} transform="rotate(16 28 28) translate(10 0)" style={FRONT} />
    </svg>
  );
}
