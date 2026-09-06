# Gap report — the discovery row (Phase 10)

Property table: `docs/superpowers/design-tables/discovery-rows.md`
Implementation: `src/components/commanders/discovery-row.tsx`, `commander-art.tsx`,
`receipt-line.tsx`, `rec-card.tsx`, `discovery-view.tsx`; `src/lib/discovery/price.ts`.

## Verify pass (Agent 2)

Every row of the 623-line property table was checked at both widths, and every row of
the state coverage table was checked for reachability through the `DiscoveryItem` type
and `src/lib/discovery/list.ts`. Three items came back.

### 1. Fit column label carried a margin the table does not give it — FIXED

The uppercase `--accent` label beside the desktop ranking figure had `marginLeft: 2` on
top of the figure row's 6px gap, carried over verbatim from the shipped owned row. The
table gives the gap as that row's only spacing. Margin removed.

### 2. `Emphasised` losing the second figure when both figures are equal — not a real issue

Reported as a mismatch, checked, and false. `Emphasised` slices `rest` past each match
before looking for the next, so `overlap(264, 264)` resolves both occurrences and emits
two `<strong>` nodes. A regression test now pins it, because the helper's correctness
here is not obvious from reading it.

### 3. Price state 6 — live but priceless — FIXED

The states matrix routes a printing that is in the newest feed but carries no non-foil
`price_cents` to the absent slot. `slotFor` could not tell it from state 3, a sold-out
printing whose last row is frozen at an older `as_of`: `liveCents` is null in both cases
and `everPriced` is true in both whenever the printing carried a price in any earlier
run, so a live-but-priceless card claimed "not stocked" — a statement about stock that
the feed does not support. `PriceAggRow` gains a `live` flag, computed as
`bool_or(as_of = (select max(as_of) from printing_prices))` over the oracle's printings,
and `slotFor` checks it ahead of the `everPriced` branch. Rows 1–5 are untouched;
`price.test.ts` now names all six rows.

## Confirm pass (Agent 3)

All three items re-checked against the fixed code. Item 1 fixed, item 2 confirmed as not
a real issue with the full trace, item 3 fixed with the SQL aggregate, the branch order
and the single call site all verified.

**VERDICT: 0 gaps remain.**

## Notes carried forward

- Novelty's tag overflow uses the same `— and N more` clause at 390px as at ≥640px. The
  table's own finding permits this ("either the mobile tile uses the same long form, or
  the copy module needs a short variant — do not invent a string"), and no string was
  invented.
- The mobile tile and the desktop grid row are deliberately separate subtrees, because
  they are different layouts: the pip moves from beside the name into the rank column,
  and the track is hoisted out of the fit column. Drift between them is prevented by the
  shared sub-components (`Pip`, `OverlapTrack`, `PriceSlot`, `UntaggedNote`,
  `ReceiptLine`), which are parameterised only where the table says the widths differ.
  The verify pass found no drift on any property the table calls identical.
