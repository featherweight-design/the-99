# Addendum: the phone colour pips

Account 2 · 2026-10-21 · touch sizes and missing states round. No new surface: rulings and missing states on what shipped from this handoff.

Canvas: https://claude.ai/artifact/8QN9aKbTdh1B2rBZSk7TgZ (board: `Precon-Pips.dc.html`). The full round, all seven items, is in `design/design_handoff_the99_touch_sizes_addendum/`.

Coarse-pointer rule for the touch items: grow only on `pointer: coarse`. A grown hit never reaches into a neighbour's; where a 44px hit would overlap, the part itself becomes the 44px slot. With a mouse everything is as shipped.

## Item 6 · Precons' phone pips

`ColourPips form="wide"` (22px, 6px gaps) in the compact chassis row on the phone (precons R4).

**The brief's worry is right.** The 44px `sheet` pips (5 × 44 with 10px gaps, 260px) plus the hairline and the 44px sort need 321px. The row is 326px at 390 but only 296px at 360, so the sort would leave the row, which decision 18 forbids.

**Answer:** on `pointer: coarse`, each pip sits centred in a **44×44 slot with no gap between slots**. The drawn pip stays 22px; the slot is the button, so there is no hit drawn past it and none overlap. Five slots are 220px; with the hairline and sort the row is 281px, 45px spare at 390 and 15px at 360. The selected ring and the Scryfall symbols are unchanged. Fine pointer: the shipped 22px pips at 6px gaps.

On the board the pips are drawn as plain colour and the rows are fixtures, for the board only.

The boards load their images from the canvas asset store (`/_blob/…`); the same images are in `art/` here.
