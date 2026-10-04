/**
 * The card details carousel (H23, `design/design_handoff_the99_card_carousel`). The footer's two
 * aria-labels and its counter were inline strings in `card-modal.tsx`; they live here now, beside
 * the strings the carousel's later rounds add. Visible labels `‹ Prev` / `Next ›` are unchanged.
 */
export const cardCarouselCopy = {
  /** The visible counter in the desktop footer (and, from the phone round, its top-left plate). */
  position: (n: number, total: number) => `${n.toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`,
  prevAria: "Previous card",
  nextAria: "Next card",
  /**
   * The provider's live region, on a successful page (handoff README decision 8, quoted
   * verbatim): "Name, then position." Never spoken on the first open — the visible counter
   * covers that — only on Prev/Next landing.
   */
  arrived: (name: string, n: number, total: number) => `${name}, ${cardCarouselCopy.position(n, total)}`,
  /** An arrow key pressed at the start of the list (decision 8, quoted verbatim). */
  firstCard: "First card in this list",
  /** An arrow key pressed at the end of the list (decision 8, quoted verbatim). */
  lastCard: "Last card in this list",
  /**
   * The desktop neighbor plate's accessible name (decision 2). Same action as `prevAria` /
   * `nextAria`, named with the card it leads to when the provider knows it; falls back to the
   * bare form for a sibling carrying only an id.
   */
  neighborAria: (direction: "previous" | "next", name?: string) => {
    const bare = direction === "previous" ? cardCarouselCopy.prevAria : cardCarouselCopy.nextAria;
    return name ? `${bare}: ${name}` : bare;
  },
} as const;

/**
 * The phone's card-first sheet (carousel R2, handoff `card-carousel · copy strings.ts`, quoted
 * verbatim). The teaser's own button and the grip's accessible name, the grip being a real control
 * for a reader who cannot drag it (plan PR 3, engineering call 2026-10-03).
 */
export const cardSheetCopy = {
  /** The teaser's expand button, pinned above the home inset. */
  expand: "All details",
  /** The grip, as a button toggling between the teaser and the full sheet. */
  grabberAria: (expanded: boolean) => (expanded ? "Show less" : "Show all details"),
} as const;
