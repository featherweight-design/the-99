# Addendum: the count stepper’s figure

Account 2 · 2026-10-21 · touch sizes and missing states round. No new surface: rulings and missing states on what shipped from this handoff.

Canvas: https://claude.ai/artifact/8QN9aKbTdh1B2rBZSk7TgZ (board: `Consider-Stepper.dc.html`). The full round, all seven items, is in `account-2/design_handoff_the99_touch_sizes_addendum/`.

Coarse-pointer rule for the touch items: grow only on `pointer: coarse`. A grown hit never reaches into a neighbour's; where a 44px hit would overlap, the part itself becomes the 44px slot. With a mouse everything is as shipped.

## Item 5 · Consider's sort select, and the count stepper's figure

**Consider's sort** (`consider-toolbar.tsx`, about 38px): on a coarse pointer, `pointer-coarse:min-h-[44px]` on the select. It has no neighbour above or below in its row, so nothing else changes. The label stays 16px so iOS never zooms. Fine pointer: as shipped.

**The count stepper** (`count-stepper.tsx`, row layout, 24×20 figure in the 34px row): today − and + draw 44px `TOUCH_HIT` hits past their 22px glyphs, and those cover all but 2px of the figure, so a tap on the count steps it instead of opening the field.

**Answer:** on a coarse pointer, three 44px-wide slots, − 44 · figure 44 · + 44 (132px). Glyphs unchanged. − and + keep `TOUCH_HIT`'s 44px height but draw no hit sideways past their slot; the field's minimum width is 44px and it still widens past two digits. Each part's hit is exactly its own slot.

- The row stays one 34px line. The slots' 44px reach 5px above and below it, as the row's ✕ already does (#1916).
- At 1, the shipped ✕ takes the − slot, so on a coarse pointer it takes the 44px slot too and nothing moves between 2 and 1.
- The band layout (tile foot) already draws 44px parts on the phone. Unchanged.
- Fine pointer: 22 · 24 · 22, as shipped.

The boards load their images from the canvas asset store (`/_blob/…`); the same images are in `art/` here.
