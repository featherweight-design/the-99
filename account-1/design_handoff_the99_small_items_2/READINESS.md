# Readiness: small items 2

**Verdict: Green.** Approved by Hugh on 2026-10-28 ("this all LGTM"), after his R1 calls on every item and the R2 redraw
of `Quick-Add-Details` A4. Nothing below blocks the build. The eight items are independent and can ship in any order;
items 1, 4 and 7 need no build.

## For Hugh

1. **Copy** is new in these places and needs `/copy-review`:
   - item 2: Show fewer (reuses the Consider panel's `consider.collapse`);
   - item 5: the ledger sentences (`{placed} placed, {here} still here`, `all {n} still here`, `none still here`,
     `· undone`, `· all {n} now yours`);
   - item 6a: Clear filters → Clear all filters on /collection, and a key for Keep only search;
   - item 6b: the hint's `→ details`, `← back to Add`, `↵ opens details`;
   - item 8: Couldn’t search just now. / Try again.
2. **About.** No new entry is owed. Item 2 changes About itself; the rest are small changes to surfaces whose entries
   already cover them.

## For engineering, by item

1. **Good to know: nothing to build.** `md:grid-cols-2 xl:grid-cols-3` and the plate's `min-height: 150` are ratified.
2. **Try it's press** (`try-it.tsx`, PR #2340). The press keeps its type and gains `▾`; it is 44 × 44 with
   `aria-expanded`. Opening moves focus to the first new card. `Show fewer ▴` after the last card folds them back and
   returns focus to the press. Per visit. Desktop unchanged.
3. **The seat picker** (`seat-picker.tsx`). A deck not listed, Another commander and Just *name* each gain a 56 × 40
   dashed slot (`--border-dashed`, 6px radius, `aria-hidden`): `?`, the search glyph, the friend's initials. Order,
   copy, the `withheld` condition and what each row seats are unchanged.
4. **Answer sheet: nothing to build.** The three errata are ratified as built (README §4).
5. **The ledger** (`provenance-line.tsx`, `fill-passes.ts`). Two-figure lines; the header unchanged. A pass with no
   live cards keeps a quiet line, so `summariseFillPasses` stops dropping it and knows whether it ended by undo or by
   keeping. Keep `provenance-line.test.tsx:92`; add a test that the still-here figures sum to the header.
6. **#412.**
   - 6a: share `ZeroState` and render it from `no-results.tsx`; collection's crown and vignette retire there; its
     breakpoint moves md → sm.
   - 6b: the quick-add popup becomes a grid (`role="grid"`, two `gridcell`s per row, `aria-activedescendant` on the
     active cell). The name cell opens the shipped card detail through `CardDetailTrigger`'s open path, with the results
     as its siblings. Key rules in README §6b.
7. **The consider tile: nothing to build.** Close #182's divergence item. Its other item ("99 means three things")
   stays open and is not in this handoff.
8. **Quick-add's failed search** (`use-card-search.ts`, `quick-add-bar.tsx`). On a rejection keep `setRows(null)` and
   raise the shared toast. The deck slot lifts above the dock while the dock is on screen.
