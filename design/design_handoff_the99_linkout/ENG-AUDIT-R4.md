# ENG AUDIT — Shopping strip link-out (#330), R4

**Verdict: 🟢 Green. No Design round-trip.** R4 self-assessed 🟡 Yellow pending two facts it could
not read from this repo. Both are now confirmed, and both resolve in the drawing's favour. The
remaining items are three factual corrections about shipped code, all resolvable engineering-side
with nothing redrawn.

The three closed decisions handed to Design are each drawn, and none was re-opened:
the action sits on the Shopping filter surface, the basket is the filter's rows, and the export link
stays with the payload retargeted.

## The two confirmations R4 asked for — both YES

| Question | Answer | Verified against |
|---|---|---|
| Does `external-link.tsx` ship R3's anatomy — underline at `color-mix(in srgb, var(--accent-hover) 45%, transparent)`, offset 3px, hover moving ink *and* underline *and* glyph to `--fg`? | **Yes, exactly.** So this pass adds no code to the component, which was the stated intent. | `src/components/ui/external-link.tsx:11–17` and the glyph span at `:38` |
| The strip's real padding and radius. | **`r9` correct. Desktop `11px 15px` correct.** Mobile ships `10px 13px`, which is what the canvas draws for the phone frame. | `src/components/decks/price-strip.tsx` — `rounded-[9px] px-[13px] py-[10px] md:px-[15px] md:py-[11px]` |

## Corrected eng-side, not sent back

1. **The strip's ground is `--surface-sunken`, not `--surface-inset`, and neither is `#14110E`.**
   The canvas labels the state table "on `--surface-inset`" and draws `#14110E`, and the README
   reasons about contrast from that value. In this repo `#14110E` is `--bg`; `--surface-inset` is
   `#1B1712`; and the shipped strip renders `background: var(--surface-sunken)` — `#18140F` on
   amonkhet. The canvas's own in-context frames draw `#18140F` for the strip, so the drawing is
   right where it renders the surface and wrong where it names it.

   **The conclusion survives the correction.** R3 measured its ink on `#1E1A15`, and `#18140F` is
   still darker than that, so every ratio still improves and the two themes R3 recorded at the margin
   still gain room rather than lose it. Only the ledger's numbers move. The re-measure is on
   `--surface-sunken` per theme.

2. **The none-priced state already renders today.** R4 §4 and the readiness doc both say the strip
   "had nothing to say in this state and did not render", and bill the new ruling as a state that
   previously rendered nothing. That is not shipped behaviour: `price-strip.tsx` suppresses the strip
   only when `provenance` is null or `summary.totalCopies === 0`. With eight unpriced rows,
   `showFigure` is false but `showClause` is `0 < 8` — so the strip renders today as
   `0 of 8 priced` above the provenance line.

   **The ruling itself is kept and is an improvement.** What changes is smaller and more precise than
   the README claims: the `0 of 8 priced` clause is dropped, and the provenance line swaps to the new
   string. Nothing appears that was not already on screen. Recorded here because QA would otherwise
   be told to look for a strip appearing where none was, and would not find one.

3. **The canvas contradicts itself on horizontal padding** — `11px 15px` in the ruled placement and
   the desktop in-context frame, `11px 14px` in all four price variants. **15px wins**: it matches
   shipped desktop and it is the value the ruled placement and the README both carry. The 14px
   instances are read as a drawing slip, not a variant-specific ruling.

4. **The mobile strip is drawn `10px 13px 0`** — zero bottom padding, with the 44px row supplying it.
   Taken as drawn; the shipped `py-[10px]` becomes `pt-[10px] pb-0` below `md:`. Called out because
   it is the one shipped value inside the strip that does move, against the README's "nothing shipped
   inside the strip moves a pixel."

5. **The 9px provenance-to-link gap is load-bearing and is kept at both breakpoints**, per R4's own
   reasoning: `outline` takes no layout space, so the focus ring overlaps that gap by 2px instead of
   displacing the provenance line.

## Noted, not blocking

- **`:visited` is not drawn.** The canvas's state table has four rows where the intro says five.
  Inherited from R3 unchanged — `:visited` is unstyled and identical to rest, and the shipped
  component styles no visited state. Nothing to build.
- **The `40px → 69px` / `52px → 96px` heights are prose, not measured in the drawing.** No ruler or
  dimension annotation backs them. They are a sanity figure for the cost of the line, not a spec;
  the padding, gap and row min-height above are the spec, and they determine the height.
- **The "nothing to buy" variant is a dashed placeholder, not a rendering.** Correct — the link
  inherits the strip's suppression rather than carrying a second condition, so there is nothing to
  draw.
- **The phone strip at 96px under the pills** is R4's own open item and is a QA observation, not a
  gate. If it reads tall the fix is the strip's vertical padding, never the 44px row.

## Structure eng owns

`shoppingList` becomes **one exported selector with three consumers** — the rows the Shopping filter
renders, the strip's total and denominator, and both `href`s. Today the export dialog composes its
own list at `builder-shell.tsx:1052` (a plain `!c.owned`, which includes unowned basics and drops
spoken-for cards) while the filter uses `isShoppingCard` at `decklist.tsx:51`. The two lists
diverge, so the shipped export link buys a basket the player never saw. Consolidating on
`isShoppingCard` is this ticket's work and needs no design input.

## Routed to `/copy-review`, not to Design

The wording of `provenanceUnpriced` — R4 proposes *"no prices from ManaPool for these"*. The
*structure* is an eng note: shipped copy composes the provenance line by joining
`strip.provenance`, `strip.lastChecked(when)` and `strip.behind` with ` · `, so the new key replaces
only the first clause and keeps `lastChecked` separate rather than fusing `{day}` into one template
as the R4 contract file writes it.

Also still owed from R3: `/copy-review` on `Buy these at Mana Pool` and `Buy any printing at Mana
Pool`, which now exist in `src/lib/copy/`.

## Housekeeping

The R4 drop removed `ENG-AUDIT-R3.md` from this folder. Restored from git — R3 remains the spec for
the primitive, the export footer and the card modal, and its audit is part of that record.
