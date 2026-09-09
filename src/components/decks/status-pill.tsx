// The status pill on a deck tile's art. One element with responsive classes —
// never a mobile subtree and a desktop subtree, which doubles the label for a
// screen reader and passes a property check on both columns while being wrong.
//
// Colour is not written here. `statusPillStyle` owns it, so a theme change is a
// token change in one file.

import { refreshCopy } from "../../lib/copy/refresh";
import type { StatusPill as Status } from "../../lib/decks/status";
import { statusPillStyle } from "../../lib/decks/status-style";

/**
 * The pill's own label, keyed off the shipped vocabulary rather than printing
 * the `StatusPill` union member. The union is a data value; `refreshCopy.status`
 * is the string a reader sees, and a rename belongs in the copy file.
 */
const COPY_KEY: Record<Status, keyof typeof refreshCopy.status> = {
  Draft: "draft",
  Building: "building",
  Over: "over",
  Unresolved: "unresolved",
  "To buy": "toBuy",
  Complete: "complete",
};

/**
 * The tile's geometry, and the default. Home's resume row draws the same pill
 * shorter, tighter and in flow rather than pinned to art, so the box is a prop
 * — the label and the fill are not, and stay written once.
 */
const TILE_CLASS =
  "absolute bottom-[13px] left-[13px] flex h-[24px] items-center rounded-[6px] px-[9px] font-mono text-[11px] tracking-[0.06em] sm:h-[22px] sm:px-[8px] sm:text-[10.5px]";

export function StatusPillBadge({
  status,
  className = TILE_CLASS,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span className={className} style={statusPillStyle(status)}>
      {refreshCopy.status[COPY_KEY[status]]}
    </span>
  );
}
