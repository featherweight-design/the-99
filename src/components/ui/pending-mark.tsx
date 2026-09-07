// The in-control loading mark. A control whose flip is a server round-trip
// wears this for the duration: dimming alone reads as a control that has been
// switched off, not one that is waiting, and on a fast connection the dim is
// the only thing that ever happens.
//
// It is the crown, not a new drawing — the app has one loading mark and this is
// it at a control's text size. `currentColor` rather than a tone: the mark sits
// inside a selected segment, whose fill is `--accent`, and the quiet tone's
// `--border-strong` would disappear against it.

import { CrownDiamonds, crownBox, type CrownGeometry } from "./crown";

const GEOMETRY: CrownGeometry = { small: 8, large: 11, gap: 5 };
const WIDTH = 28;

export function PendingMark() {
  const { width, height } = crownBox(GEOMETRY);
  return (
    <svg
      aria-hidden
      data-pending-mark
      viewBox={`0 0 ${width} ${height}`}
      width={WIDTH}
      height={Math.round((WIDTH * height) / width)}
      className="block"
    >
      <CrownDiamonds geometry={GEOMETRY} fill="currentColor" pulse />
    </svg>
  );
}

/**
 * The mark plus the width it occupies, held whether or not it is showing.
 *
 * The segmented controls put a slot on their selected segment and only there.
 * Exactly one segment is selected at any moment, so the group's width is the
 * same before, during and after a flip — a slot that appeared with the mark
 * would shove the neighbouring segment sideways for the length of the request,
 * which is the jitter the loading state exists to replace.
 */
export function PendingSlot({ pending }: { pending: boolean }) {
  return (
    <span aria-hidden className="inline-flex justify-center shrink-0" style={{ width: WIDTH }}>
      {pending && <PendingMark />}
    </span>
  );
}
