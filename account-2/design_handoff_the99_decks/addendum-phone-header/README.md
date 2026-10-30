# Addendum: the phone deck header row

Account 2 · 2026-10-21 · touch sizes and missing states round. No new surface: rulings and missing states on what shipped from this handoff.

Canvas: https://claude.ai/artifact/8QN9aKbTdh1B2rBZSk7TgZ (board: `Deck-Header.dc.html`). The full round, all seven items, is in `account-2/design_handoff_the99_touch_sizes_addendum/`.

Coarse-pointer rule for the touch items: grow only on `pointer: coarse`. A grown hit never reaches into a neighbour's; where a 44px hit would overlap, the part itself becomes the 44px slot. With a mouse everything is as shipped.

## Item 3 · The phone deck header row

Update from a list · Export · Commit as vN · ⋯ (`spine-mobile.tsx`, #2118).

**Answer: confirmed at 390 and up; one change under 390.** Under 390px (`max-[389px]`) the first button reads **Update**, keeping `entryAria` as its accessible name. Nothing else moves: Export stays icon-only under 480, Commit as v1 keeps its primary, ⋯ stays last. One line at 390 and 360, no wrap. Desktop unchanged.

Measured (Plex Mono 11, Plex Sans 600 13): Update from a list 138.8 · Export 36 · Commit as v1 113.7 · ⋯ 44 · gaps 3×8.
- 390: 356.5 in 358 (1.5px spare).
- 360: 356.5 in 328, so it overflows. With Update (59.6): 277.3.
- Without the commit offer at 360: 234.8 (full label), 155.6 (Update).

Not taken: tighter gaps and padding (gives back at most 22px of the 28.5 needed); Update as an icon (two bare icons side by side read as one control); moving Update into ⋯ (the header's ⋯ drops Update on purpose, because the row draws it).

### New words, for /copy-review

| Key | Copy |
| --- | --- |
| `update.entryLabelShort` | Update |

The boards load their images from the canvas asset store (`/_blob/…`); the same images are in `art/` here.
