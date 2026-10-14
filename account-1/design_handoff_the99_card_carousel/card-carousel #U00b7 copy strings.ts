// Card details carousel (H23). Proposed strings for /copy-review. Copy is not settled here.
// The two shipped inline aria-labels in card-modal.tsx move into keys; four strings are new.

export const cardCarouselCopy = {
  /** Visible counter: phone top-left plate, desktop footer. Shipped inline as `{n} of {total}`. */
  position: (n: number, total: number) => `${n.toLocaleString()} of ${total.toLocaleString()}`,
  /** Desktop footer controls. Shipped inline; visible labels `‹ Prev` / `Next ›` unchanged. */
  prevAria: "Previous card",
  nextAria: "Next card",
  /** NEW. Peek (phone) and neighbor (desktop) buttons. */
  prevNeighborAria: (name: string) => `Previous card: ${name}`,
  nextNeighborAria: (name: string) => `Next card: ${name}`,
  /** NEW. Provider live region, on arrival at a paged card. */
  arrived: (name: string, n: number, total: number) =>
    `${name}, ${n.toLocaleString()} of ${total.toLocaleString()}`,
  /** NEW. Arrow key pressed at an end. */
  firstCard: "First card in this list",
  lastCard: "Last card in this list",
} as const;

// R2 (phone, card first). NEW.
export const cardSheetCopy = {
  /** The teaser's expand button; also the sheet's accessible name for the expanded state. */
  expand: "All details",
  /** aria-label on the grabber, as a button toggling between the two states. */
  grabberAria: (expanded: boolean) => (expanded ? "Show less" : "Show all details"),
} as const;

// REUSED, unchanged: cardZoomCopy.*, the ✕ "Close card details", cardLinkOutCopy.card.
// RETIRED: the `1 of 1` drawing on a list of one (no string; the row stops rendering it).
