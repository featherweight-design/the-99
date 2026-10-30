// design_handoff_the99_printed_name/printed-name · copy strings.ts
//
// Two new strings. Everything else in this addendum is an existing string
// re-sourced from resolvedPrinting() instead of the oracle row.
//
// Locked decision 4: the modal is the only place the oracle name appears on
// screen. So these are the only strings the addendum adds, on any surface.

export const printedName = {
  /**
   * The modal header's oracle-name label. Mono, lowercase, 10.5px, --fg-faint.
   *
   * One word on purpose: the modal's meta grid already carries a `Printing`
   * field naming the set and collector number, so the line does not have to
   * explain itself. Lowercase mono is the shipped field-label register
   * (`no number · ×1`, `SLD · 2208`) — not the uppercase letterspaced
   * register, which is reserved for section labels.
   *
   * Do NOT render this when resolvedPrinting().name === oracleName. The whole
   * line is absent in that case, label included — no placeholder, no reserved
   * height. See STATES matrix 3.
   */
  oracleLabel: "oracle",

  /**
   * The decklist row's aria-label fragment, carrying the FULL printed name
   * regardless of what the visible string was truncated to.
   *
   * This is the accessible half of call 2: the visible name may clip at ~13
   * characters on desktop, and this string never does. There is deliberately
   * no `title` attribute — a hover tooltip is pointer-only recovery on a
   * phone-first surface.
   *
   * Composed into the row's existing aria-label alongside the count and the
   * availability marker's `spoken` prose; it does not replace them.
   */
  rowNameForLabel: (printed: string) => printed,

  /**
   * The deck tile's aria-label name fragment. R2.
   *
   * Replaces the shipped `title={card.name}` on deck-card-tile.tsx:188 — a
   * tooltip is pointer-only recovery on a phone-first surface, fires on a
   * delay, and duplicates what a label says properly. Remove the title when
   * this lands; do not ship both.
   *
   * Same contract as rowNameForLabel: always the FULL printed name, however
   * the visible caption was truncated. The tile caption is the tightest block
   * on the feature (132px with the ✕ moved to the art corner, 94px without),
   * so this fires more often here than on the row.
   */
  tileNameForLabel: (printed: string) => printed,

  /**
   * Two-faced cards. R2.
   *
   * Rows and tiles show the FRONT face's printed name alone — a `//` string of
   * unpredictable length cannot land in a 93px tile caption or a 105px phone
   * row block, and locked 3 forbids the second line that would rescue it. The
   * `//` layout mark already tells the reader there is a back face.
   *
   * The modal title carries both, and so does the oracle line beneath it:
   *   title:  "Battle of Olympus // Aftermath"
   *   oracle: "World at War // Recover"
   *
   * Both halves render even when only one face is renamed — that is exactly
   * the case where showing one name would mislead.
   */
  faceSeparator: " // ",
  frontFaceName: (printed: string) => printed.split(" // ")[0],
} as const;

// ── Re-sourced, not new ──────────────────────────────────────────────────────
//
// NOTE (R2): the deck route needs a printing join before either of the first
// two lines below can resolve — lib/decks/read.ts:196-254 is oracle-only. The
// modal and both collection surfaces already resolve a printing for the art.
//
// decklist-row.tsx        name  ← resolvedPrinting().name
// deck card tile          name  ← resolvedPrinting().name
// collection/grid-view    name  ← resolvedPrinting().name
// collection/rows-view    name  ← resolvedPrinting().name
// card modal, title       name  ← resolvedPrinting().name
// card modal, oracle line name  ← oracle row's name (the only new read)
//
// Unchanged and explicitly out of scope: card-search-row (the player is
// choosing between printings and the set code is already on the row),
// unresolved-row (no oracle id), update-diff-row and synergy-row (auditing
// oracle cards, not looking at their own copy).
