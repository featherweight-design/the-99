## Basic lands stepper (R2, 2026-10-14)

Handoff: `design/design_handoff_the99_basic_lands_stepper/`.

| Element | Phone (390) | Desktop |
|---|---|---|
| Row stepper | Replaces ✕ on `isBasicLand` rows. No box, no border. Buttons 44×44, glyph 15px mono `--fg-faint`. Count field 24px, 16px mono `--fg-body`. 112px in all. | No box. Buttons 22×20, glyph 13px, `--border-dashed` at rest, `--fg-body` on row hover/focus. Count 24px, 12px mono `--fg-body`. Row stays 34px, shipped 7px padding. |
| Tile control | Over the art's foot, full width, 44px, 70% `--bg` scrim, no border. Buttons 44×44, glyphs `--fg-body`. | 32px, buttons 32×32, glyphs `--fg-faint` lifting to `--fg` on tile hover/focus. |
| At 1 | − slot draws the shipped ✕ (13px) with `removeAria`. | Same. |
| Change marker | `from N`, mono 11px `--fg-faint` after the name; shipped 2px accent edge. Tile: caption meta, `--accent`. | Same. |
| Focus | Buttons: 2px `--accent` ring. Field: 2px `--accent` underline under the count. | Same. |
| Refused | Shipped `MutationError` under the row or tile. | Same. |
| Hidden on | Non-basic rows, commander rows, read-only (precon) lists. | Same. |
