## Basic lands stepper (R1, 2026-10-14)

Handoff: `design/design_handoff_the99_basic_lands_stepper/`.

| Element | Phone (390) | Desktop |
|---|---|---|
| Row stepper | Replaces ✕ on `isBasicLand` rows. Box 36px, radius 9, 1px `--border-strong`. Buttons 44×44, glyph 16px mono `--fg-muted`. Field 30px, 16px mono. | Box 28px, radius 7. Buttons 28×28, glyph 14px, `--border-dashed` at rest, `--fg-body` on hover/focus. Field 30px, 12.5px mono. Row padding 3px vertical, row stays 34px. |
| Tile band | Over the art's foot, full width, 44px, `--surface-sunken`, 1px `--border-strong` top. Buttons 44×44. | 32px, buttons 32×32, rest/hover inks as the row. |
| At 1 | − slot draws the shipped ✕ (13px) with `removeAria`. | Same. |
| Change marker | `from N`, mono 11px `--fg-faint` after the name; shipped 2px accent edge. Tile: caption meta, `--accent`. | Same. |
| Focus | Buttons: 2px `--accent` ring, inset. Field: box border `--accent`. | Same. |
| Refused | Shipped `MutationError` under the row or tile. | Same. |
| Hidden on | Non-basic rows, commander rows, read-only (precon) lists. | Same. |
