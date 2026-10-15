## Collection sync (R2, 2026-10-15)

Handoff: `design/design_handoff_the99_collection_sync/`. Kaldheim values; every value is a shipped token.

| Element | Phone (390) | Desktop |
|---|---|---|
| Choice grid | One column, gap 12; Sync third. | `grid-cols-3`, gap 20, `align-items:start`; Sync third. |
| Step title | `What’s this file for?`, display 18px. | Same words, display 29px. |
| Sync card | Shipped `Card`: radio 22, padding 14, title 15/600, body 13.5, figure mono 13 `--fg-muted`. | Padding 22, title 17/600, body 14. R2: radio on the title row (absolute at 22,22; title `padding-left:34px`, line 26px); body, figure and note full width. Applies to all three cards. |
| Sync note | Shipped overlap-note box: `--surface-sunken`, radius 10, padding 12×14, ⓘ `--fg-faint`, 13.5px `--fg-muted`. | Same. |
| Unavailable card | Background `--surface-sunken`; radio border `--border-strong`; title `--fg-muted`, body `--fg-faint`; reason box 1px dashed `--border-dashed`, radius 10, 13.5px `--fg-body`; `aria-disabled`, `aria-describedby` the reason. | Same. |
| Stale banner | Shipped warning box (`--elevated-hover`, `--border-strong`, 3px left `--warning`, ⚠); bold lead `--fg` 600; above the radiogroup, margin-bottom 14. | Margin-bottom 18. |
| Stale follow-up | `fieldset` after the radiogroup, legend 14/600; options stacked gap 8: 1px `--border-strong`, radius 10, padding 12×14, min-height 44; radio 18; title 14/600, body 13 `--fg-muted`; picked border `--accent`. | Three columns, gap 12. |
| Tiles | 2×2, gap 10, shipped `Tile`. `to decide` ink `--warning` + border `--warning` while > 0, `--fg-faint` at 0; `from the file` `--success`; the other two `--fg`. | 4 across, gap 12. Tiles are one `aria-live="polite"` region. |
| Tokens line | `--surface-sunken`, radius 10, padding 12×14, ⓘ `--fg-faint`, 13.5px `--fg-body`. | Adds the mono 12px figure right, `--fg-muted`. |
| Conflicts section | `--surface-sunken`, 1px `--border-strong`, radius 12, padding 14; heading shipped list heading; lede 13px `--fg-body`; bulk buttons full width, 44px, ghost, 13/600. | Padding 16×18; bulk buttons right of the heading; column heads mono 10.5px `--fg-faint`. |
| Conflict row | `fieldset`, `--surface`, 1px `--border`, radius 8, padding 10×12; name 13.5px; mono line `set number · finish · at Oct 2 ×b` 10.5px `--fg-faint`; two radios side by side, 44px, radius 8, 1px `--border-strong`; picked `--accent` border on `--accent-dim` fill. Unanswered: 3px left `--warning`. | Grid `1fr 90px 128px 128px`, gap 10; `was` right-aligned mono 12px. |
| Bulk pressed | `aria-pressed="true"`, border `--accent`, until any row changes by hand; `role="status"` line. | Same. |
| Kept list | Shipped `Rows`, tone other, delta ink `--fg-body`; heading `Kept from The 99 · N`. | Same, in the shipped two-column grid. |
| Overwrite banner | Shipped warning box; only when a conflict is answered File. | Same. |
| `edited` tag | Shipped; only on a file-side row that came from a conflict answered File. | Same. |
| Bar | Shipped phone bar; summary 11.5px `--fg-faint` (undecided: `--warning`); Sync collection primary. Held: `aria-disabled`, opacity .4, press scrolls to and focuses the first unanswered row. | Shipped desktop bar; sentence 13.5px `--fg-body`. |
| Short-deck | Shipped §E sheet; `Syncing leaves N decks short` / `Sync anyway`. | Shipped dialog. |
| History kind | `Sync upload`, mono in the 150px kind column. | Same. |
