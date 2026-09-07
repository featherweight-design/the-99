// shopping-strip-linkout · copy strings — #330, R4
// design/design_handoff_the99_linkout/
//
// R4 adds ONE string and ONE call site. Everything else here is a pointer to what
// already shipped, recorded so the diff can be read without opening R3.
//
// ── unchanged, and now used twice ─────────────────────────────────────────────
//
//   linkOut.deck = "Buy these at Mana Pool"      ← `manapool-linkout · copy strings.ts`
//
// Call sites after this pass:
//   1. price-strip.tsx      — the strip's last line, under the provenance line.   NEW
//   2. export-dialog.tsx    — the Shopping tab's second footer row.               shipped
//
// One string across both is correct rather than duplicated: after R4 both doors
// render the SAME list, so `these` resolves the same way on both surfaces. Had the
// lists stayed divergent, one string across both would have been the bug.
//
// `linkOut.newTab` (" (opens in a new tab)") and the aria-hidden ↗ come with the
// component and are not re-specified here.

// ── the one new string ────────────────────────────────────────────────────────

export const strip = {
  /**
   * The shipped provenance line. Unchanged.
   * Renders when at least one row in the Shopping filter has a price.
   */
  provenance: "prices from ManaPool · last checked {day}",

  /**
   * NEW. Replaces `provenance` when NO row in the Shopping filter has a price.
   *
   * Before R4 the strip had nothing to say in this state and did not render — the
   * addendum's ruling was `no figure at all`, and a total of zero cards is not a
   * total. It has something to say now, because the link is there: we could not
   * price these, the store can.
   *
   * States the absence, not a check we cannot evidence. No `0 of 8`, no figure,
   * no error tone — this is still --fg-faint mono at 9.5px.
   */
  provenanceUnpriced: "no prices from ManaPool for these · last checked {day}",

  /**
   * The stale-run clause. Unchanged: third clause and last, appended to either
   * provenance line above.
   */
  behindClause: " · these are behind",
} as const;

// ── the href, shared by both doors ────────────────────────────────────────────
//
//   `${MANAPOOL}/add-deck?deck=${base64(shoppingList)}`
//
// `shoppingList` is ONE selector with three consumers: the rows the filter renders,
// the strip's total and its denominator, and both hrefs. Its contents:
//
//   in    cards you don't own
//   in    spoken-for cards (owned, committed to another deck) — they are on screen
//         with a `buy` tag and a price inside the total; excluding them would make
//         the total a figure you cannot pay
//   in    `sold out` rows — our check is hours old, the store's is live
//   in    unpriced rows — the absence is ours, not the store's
//   out   basic lands — not on the filter, so not in the basket. No clause of its
//         own; it falls out of `the basket is the filter's rows`
//   out   a row the player just ✕'d — it leaves the screen, the basket and the
//         total together
//
// Derived AT CLICK, never cached: the ✕ has no sync to perform.
//
// ── rendering conditions ──────────────────────────────────────────────────────
//
//   strip renders     Shopping filter active && shoppingList.length > 0
//   link renders      whenever the strip does — NO second condition
//   figure renders    at least one priced row (unchanged)
//
// The link inherits the strip's condition rather than carrying its own, which is
// what makes `absent, not disabled` structural here instead of a rule to remember:
// it cannot render where it would be wrong.
//
// ── markup ────────────────────────────────────────────────────────────────────
//
//   <ExternalLink href={buyHref}>{linkOut.deck}</ExternalLink>
//
// As shipped: no variant, no `size` prop, no new token. The 44px target is on the
// strip's last ROW below `md:` (min-height: 44px), never on the link.
