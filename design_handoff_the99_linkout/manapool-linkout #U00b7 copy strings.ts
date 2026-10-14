// manapool-linkout · copy strings — #330, R3
// design/design_handoff_the99_decks/
//
// Labels are unchanged from R2 and are final. Do not ship R1's:
//   `Buy on Mana Pool`      → stale. A checkout's promise on a shelf's destination.
//   `Buy these on Mana Pool` → stale. Preposition only; `at` now covers both.
//
// The card link lands on Mana Pool's all-printings grid, keyed by the ORACLE CARD —
// never a printing. The app recommends an oracle card, so any printing we linked would
// have been arbitrary. `any printing` is in the label because a player who expects one
// listing and lands on a grid of twelve has been surprised by us.
//
// Grammar: `Buy … at Mana Pool`, the middle naming what the player will find there.
// No count and no price in either — the export dialog already says `8` on the tab pill
// and in `8 cards you don't own`, and the card link reads no price at all.
//
// The ↗ glyph is NOT in these strings. <StoreLink> renders it as an aria-hidden sibling
// span, nbsp-bound to the last word so it can never wrap alone. The accessible name is
// the label plus `linkOut.newTab`, in that order.

export const linkOut = {
  /**
   * Export dialog → Shopping tab. Left-aligned in the footer's second row, below the
   * footer's own top hairline, quieter than `Copy shopping list` and `.txt`.
   */
  deck: "Buy these at Mana Pool",

  /**
   * Shared card modal. Desktop: the leading edge of the pinned `‹ Prev · N of M · Next ›`
   * row. Mobile: its own row below the meta grid. One string for every card — owned or
   * not, priced or not, whichever of the three routes opened the modal.
   */
  card: "Buy any printing at Mana Pool",

  /** sr-only, appended inside the <a> after the label. Carries the promise the ↗ makes. */
  newTab: " (opens in a new tab)",
} as const;

// URLs — settled 2026-09-06, no longer carried:
//
//   deck → `${MANAPOOL}/add-deck?deck=${base64(list)}`
//   card → `${MANAPOOL}/cards?q=${encodeURIComponent(card.name)}`
//
// The card URL is keyed by the ORACLE CARD's name, not by the printing the modal happens
// to be showing — that printing is the picker's state, not the recommendation's.
//
// Markup contract:
//
//   <a href={href} target="_blank" rel="noopener">
//     {linkOut.card}
//     <span aria-hidden="true">&nbsp;↗</span>
//     <span className="sr-only">{linkOut.newTab}</span>
//   </a>
//
// `rel` is `noopener` and nothing more: no referral arrangement exists, so `noreferrer`
// is neither needed nor harmful to omit. Revisit only if one is signed.
//
// If the destination is ever ruled same-tab, `linkOut.newTab` and the ↗ are removed
// TOGETHER — they are one decision, and a same-tab link wearing an outbound glyph is a
// lie the convention would inherit.
