# Alternate printings from search · R3: a steady shelf, and search by set

Account 2, 2026-11-22. Status: **R3 option A approved by Hugh, 2026-11-22.** Canvas: https://claude.ai/artifact/KSnSLykQbb42zUq5XKXCHf
(R3 row: R3 · Phone A, R3 · Phone B for the record, R3 · Desktop). design-assets 499ade9.

Hugh: on the phone the shelf jumps when you swipe between a card with printings (strip, +98px) and one without, and you
can't search printings for a set. R3 replaces R2's phone strip. Desktop keeps the strip.

## Calls (A)
1. **No strip on the phone teaser.** The teaser is 280 on every card (drop `PRINTING_STRIP_TEASER_HEIGHT` from the teaser),
   so swiping never resizes the shelf.
2. **The set line becomes the printings button** at 2+ printings: a plate like the price, `STA · 10 | 22 printings ▾`
   (`aria-haspopup="dialog"`). At one printing it stays the plain mono set line.
3. **Printings panel** over the shelf (phone: the sheet grows to 400 only while it's open, card band shrinks; desktop: a
   popover over the details column, under the strip). Head: the shipped `SearchField` (`Search {n} printings by set`) and a bare ✕.
   Body: a 5-across grid (6 on desktop) of 62px card-shaped thumbs, labelled `SET number` (owned: `◆ SET`, `SET ×N`). No query:
   `In your collection · k` then `Other printings · m` (unowned: one ungrouped grid). With a query: matches on set name, set code
   or collector number, `{k} of {n} printings`, grouped by set name.
4. **Selecting = the R2 preview** (`previewId`): the card above changes, and the panel stays open for more. ✕, Escape, a pull
   down or paging closes it. Nothing is stored, and your pick never changes.
5. **Desktop:** the R2 strip stays, with a leading **Search** tile (dashed, 48×67) that opens the panel popover.
6. Full sheet / Set field: unchanged from R2.

Option B (keep the strip and hold its row on every card, `The only printing` thumb) was not chosen.

## Strings (DRAFT, /copy-review)
`{n} printings ▾` (button) · `{set} {number}. {n} printings. Search and view them.` (button aria) · `Search {n} printings by set` ·
`Close printings` · `{k} of {n} printings` · `In your collection · {k}` · `Other printings · {m}` · `Search` (tile) /
`Search printings` (tile aria) · `No printings match “{q}”` (empty, not drawn).

## Files
`R3-*.dc.html`, `canvas.json`, `art/r3-*.webp`. `scratch-gen-r3/`: `printings-panel.tsx` (panel, button, tile as drawn; static,
no state), `patch3.py` (wires them over main 83ed398 via `globalThis` render hooks; scratch only), `render3.tsx`, `gen3.py`.
