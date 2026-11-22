# Wishlist remembers the printing you want · R1

Account 1, 2026-11-22. Status: **R1 approved by Hugh, 2026-11-22 (LGTM), calls Q1–Q3 as drawn.**
Canvas (Design type): https://claude.ai/artifact/SQKaQzZmGwmxrbyRLh7KEa (Main, Tile, Phone, Desktop).

Builds on `design_handoff_the99_alternate_printings/README-R3.md` (printings button and panel on the phone, strip with Search
tile on desktop, `previewId`). It reverses alternate printings R1's ruling Q7 ("the wishlist stays per card"): a wishlist line
can now name one printing. Unchanged by Hugh's ruling (2026-11-22): **Shopping stays deck-only** (Social R2 call 10 stands), so
the chosen printing sets the tile's price, the card window's Mana Pool link and the price-drop alert instead of a Shopping line.
Deck slots stay owned-only. Any printing stays the default.

## Calls
1. **The tile (the "row").** A third mono line under the shipped caption: the price, then the wanted printing behind the
   wishlist's bookmark glyph, `$24.50 ▮ SLD 2125`; the tile's art is that printing's. **Any printing is the price alone**
   (`$3.99`, the cheapest, the figure every buy tag uses): no words for the default (Q1). Sold out: `sold out ▮ SLD 2455`, art
   kept. Phone shows the set code only (`SLD`); the number joins from `md`. No price at all (never stocked): the line is the
   printing alone, or not drawn for any printing (price.ts: silence is a state). A friend's tile (`wants N`) is unchanged.
2. **Where you choose: the card window only.** The tile stays one press (minimal controls).
   - Desktop: the Wishlist box gains a `Printing` line under the want row. With another printing on screen (the strip's
     preview), it offers one press, `Want SLD 2125`. Once wanted: a 24×34 thumb, `SLD 2125 · $24.50`, and `Any printing` to go
     back. Nothing on screen but the wanted one: no press.
   - Phone (Q2): the R3 printings panel, on a card in your wishlist, gets a foot: `▮ Wanted: any printing` and the same
     `Want SLD 2125` press for the printing on screen; `Any printing` once the shown one is the wanted one. The teaser stays
     280. The full sheet's Wishlist box shows the same Printing line.
   - The desktop panel popover gets the same foot. The wanted printing's thumb (strip and panel) gets the bookmark before its
     label.
   - A card opened from a tile with a chosen printing opens on it: `previewId` starts at the wanted printing. Wanting a printing
     never changes the collection's pick, and the preview rules (forgotten on close or paging) are R2's.
3. **Price, link, alert.** The tile and the Printing line show the chosen printing's figure. The link-out reads
   `Buy SLD 2125 at Mana Pool` (that printing's page) in place of `Buy any printing at Mana Pool`. The price-drop alert watches
   the chosen printing: choosing or changing one resets `price_at_add_cents` to that printing's figure then, and the feed line
   reads `at SLD 2125.` for `at the cheapest printing.` Back to any printing resets it to the cheapest.
4. **Sold out (Q3): the choice stays** until you change it. The box: `SLD 2125 · sold out` and
   `Mana Pool has none now. Any printing is $1.49.`; the link-out falls back to any printing; no price-drop alert while it has
   no price (as today). The card window's price tag shows its shipped `no stock`.
5. **Phone vs desktop:** one design. Differences: the phone chooses in the panel's foot (the box sits in the full sheet), and
   the phone tile drops the collector number.

## Strings (DRAFT, /copy-review)
`Printing` (box line label) · `Any printing` (line value and the press back) · `· cheapest` (any printing, nothing else on
screen) · `Want {set} {number}` (press) · `Wanted: any printing` / `Wanted: {set} {number}` (panel foot) · `sold out` (shipped
`priceCopy.tag.soldOut`) · `Mana Pool has none now. Any printing is {price}.` · `Buy {set} {number} at Mana Pool` (link-out) ·
feed `at {set} {number}.` · tile line `{price}` / `sold out` + `{set}[ {number}]`. Aria: see `copy strings.ts`.

## Files
`*.dc.html`, `canvas.json`: the boards; `art/wp-*.webp` the frames (2×). `scratch-gen/`: same recipe as alternate printings'
(scratch copy of main 016e0ba, drop @fwd-stack, `npm install --ignore-scripts`, stub tsconfig, `DATABASE_URL` dummy for tsx;
alternate printings' `scratch-gen-r3/patch3.py` and `printings-panel.tsx` first), then `patch4.py` and `wishlist-printing.tsx`
(this round's parts, static, `globalThis` hooks), `render4.tsx` (card window), `render-wl.tsx` (Wishlist tab), `shot.mjs`,
`gen.py` (boards). `proposal.diff` is the whole scratch diff against main's `src/`. Reference only; never import.
