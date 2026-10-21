# Addendum: the deck ⋯ and Sort menu rows

Account 2 · 2026-10-21 · touch sizes and missing states round. No new surface: rulings and missing states on what shipped from this handoff.

Canvas: https://claude.ai/artifact/8QN9aKbTdh1B2rBZSk7TgZ (board: `Menus.dc.html`). The full round, all seven items, is in `design/design_handoff_the99_touch_sizes_addendum/`.

Coarse-pointer rule for the touch items: grow only on `pointer: coarse`. A grown hit never reaches into a neighbour's; where a 44px hit would overlap, the part itself becomes the 44px slot. With a mouse everything is as shipped.

## Item 4 · Menu rows at 38px

Deck ⋯ menu and Sort (decks), the Order menu (commanders_discover), the friend ⋯ menu (social_r1).

**Answer: grow on a coarse pointer only.** On `pointer: coarse`, each menu row is `min-height: 44px` with 14px labels: the deck ⋯ `ITEM`, `DeckSortMenu`/`OrderMenu` rows, the `RackSelect` menu rows, and the friend ⋯ "Remove friend" row. Fine pointer: 38px and 13px, as shipped. No hit is drawn past a row, so no row reaches into its neighbour.

This matches what already ships: the pod menu has 44px rows and 14px labels on the phone. These four now match it, by pointer rather than width.

What grows:
- Deck ⋯ (header, 2 rows): 77 → 89px. The tile's ⋯ (up to 5 rows) grows the same way and still opens within the tile's flip room.
- Sort, 3 rows: 115 → 133px.
- Your commanders' Order, 2 rows: 90 → 102px.
- Friend ⋯, 1 row: 38 → 44px.
- Discover's Order rows carry glosses and are already about 55px. They do not change.

The boards load their images from the canvas asset store (`/_blob/…`); the same images are in `art/` here.
