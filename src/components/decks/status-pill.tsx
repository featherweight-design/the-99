// The status pill on a deck tile's art. One element with responsive classes —
// never a mobile subtree and a desktop subtree, which doubles the label for a
// screen reader and passes a property check on both columns while being wrong.
//
// Colour is not written here. `statusPillStyle` owns it, so a theme change is a
// token change in one file.

import { deckStateMarksCopy } from "../../lib/copy/deck-state-marks";
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

/**
 * The two deck-state marks, which are drawn on the pill and are not statuses.
 * `hollow` is a deck with no committed version — a plan rather than a deck;
 * `pending` is a committed deck whose draft has moved. Mutually exclusive by
 * definition, which `statusPillStyle`'s own type enforces.
 *
 * The mark's name rides in an `sr-only` span rather than on the box, because an
 * edge and an untinted plate have no text at all: a sighted reader gets the
 * treatment and the figure beside it, and this is everything a reader without
 * them would otherwise miss. On the deck tile that span is inside an
 * `aria-hidden` footer and says nothing — the tile composes its whole name in
 * `deck-card.tsx`, and this would be the second announcement of one fact.
 */
export function StatusPillBadge({
  status,
  className = TILE_CLASS,
  hollow = false,
  pending = false,
  announceMark = true,
}: {
  status: Status;
  className?: string;
  hollow?: boolean;
  pending?: boolean;
  /**
   * Whether the mark's name rides along. Off where the SURFACE already states
   * the same fact in words a reader will hear anyway: the deck page prints
   * `Not committed yet` under the bar and `PendingBanner` heads the draft with
   * `Pending changes: not yet a version`, so announcing it on the chip as well
   * says one thing twice.
   *
   * On by default, because the two surfaces that say nothing else — the deck
   * tile's grid and Home's resume row — are the ones the mark has to carry
   * alone.
   */
  announceMark?: boolean;
}) {
  const mark = !announceMark
    ? null
    : hollow
    ? deckStateMarksCopy.phase.markAria
    : pending
      ? deckStateMarksCopy.markAria
      : null;
  return (
    <span
      className={className}
      style={hollow ? statusPillStyle(status, { hollow: true }) : statusPillStyle(status, { pending })}
    >
      {refreshCopy.status[COPY_KEY[status]]}
      {mark !== null && <span className="sr-only">{`, ${mark}`}</span>}
    </span>
  );
}
