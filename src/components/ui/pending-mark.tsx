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
 * A label that becomes the mark while it waits.
 *
 * The label keeps its box and the mark is laid over it, so the control is
 * exactly as wide waiting as it is idle and its neighbours never move. A slot
 * reserved beside the label holds the width too, but it is an empty gap for all
 * the time the control is not waiting, which is nearly all of it.
 *
 * `opacity-0` rather than `invisible`: the Retry buttons take their accessible
 * name from this text, and `visibility: hidden` would drop it from that
 * computation — leaving an unnamed button for exactly as long as the request
 * it is reporting on.
 */
export function PendingLabel({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={pending ? "opacity-0" : undefined}>{children}</span>
      {pending && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <PendingMark />
        </span>
      )}
    </span>
  );
}
