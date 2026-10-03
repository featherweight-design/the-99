/**
 * The card details carousel (H23, `design/design_handoff_the99_card_carousel`). The footer's two
 * aria-labels and its counter were inline strings in `card-modal.tsx`; they live here now, beside
 * the strings the carousel's later rounds add. Visible labels `‹ Prev` / `Next ›` are unchanged.
 */
export const cardCarouselCopy = {
  /** The visible counter: the desktop footer, and the phone's top-left plate. */
  position: (n: number, total: number) => `${n.toLocaleString()} of ${total.toLocaleString()}`,
  prevAria: "Previous card",
  nextAria: "Next card",
} as const;
