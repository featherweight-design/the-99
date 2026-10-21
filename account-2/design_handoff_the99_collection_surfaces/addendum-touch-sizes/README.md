# Addendum: a proxy row’s deck links

Account 2 · 2026-10-21 · touch sizes and missing states round. No new surface: rulings and missing states on what shipped from this handoff.

Canvas: https://claude.ai/artifact/8QN9aKbTdh1B2rBZSk7TgZ (board: `Proxy-Links.dc.html`). The full round, all seven items, is in `account-2/design_handoff_the99_touch_sizes_addendum/`.

Coarse-pointer rule for the touch items: grow only on `pointer: coarse`. A grown hit never reaches into a neighbour's; where a 44px hit would overlap, the part itself becomes the 44px slot. With a mouse everything is as shipped.

## Item 7 · A proxy row's deck links

`decks/proxy-list-view.tsx` on Collection › Proxies: each deck link is 17px of 11px mono, sitting on top of the row's stretched card press, with the row's 11px bottom padding between it and the next row's press.

**Answer:** on `pointer: coarse`:
- deck links take `min-h-[44px] min-w-[44px] inline-flex items-center` (text stays 11px, centred);
- the links line loses its 2px top margin;
- the row's bottom padding goes from 11px to 0, so the 44px line ends at the row's edge and never reaches into the next row.

The commander plate sits on the same line, centred; it is not a press, so it does not grow. Two links that wrap make two 44px lines, each inside its own row. A row with deck links grows from about 72px to 88px; a row with none does not change. Fine pointer: as shipped.

Considered and dropped: a 44px `TOUCH_HIT` centred on the 17px link would reach 13.5px under it, past the 11px padding and 2.5px into the next row's press.
