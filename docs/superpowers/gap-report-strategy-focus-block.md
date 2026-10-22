# Gap report: strategy focus block (PR 3)

Handoff `design/design_handoff_the99_strategy_focus/` (R2g). Property table: `design-tables/strategy-focus-block.md`
(244 rows, 24 tables). Verify pass found 4 visual gaps and 1 partial state. All 4 visual gaps were fixed and the
confirm pass found 0 remaining.

| # | Gap | Fix |
|---|---|---|
| 1 | The heading and sub shared one wrapper (sub beside the heading on desktop) | The heading sits alone in its row; the sub is its own child 12px below |
| 2 | Heading 9.5/10px, weight 400, .14em on the phone | 10.5px, weight 500, .16em at both widths |
| 3 | Sub 9.5px on the phone, `leading-normal` on desktop | 10.5px, line-height 1.5 at both widths |
| 4 | Picked row's name stayed `--fg` at 400; first row carried a transparent top border | Name in accent at 600 (the count stays `--fg-muted`); no border on the first row |

## Deliberate deviations (not gaps)

- **Ring colours per theme.** The boards hard-code Low Sun hex for the five rank arcs and the pending arc. The
  block derives them per theme: `color-mix(in oklab, var(--fg-muted) 61/48/37/28/21%, var(--surface-rail))`, fitted in
  oklab to the boards' rank hex (within 6 of 255 per channel in Low Sun), and `color-mix(in oklab, var(--accent-hover)
  66%, white)` for the growth arc (#EBBB92 against the board's #F0C08E: no mix of the theme's tokens reaches it exactly).
- **Accent text through `--accent-text`.** The picked row's name and icon, the medallion's icon and Keep it balanced are
  drawn in `--accent-text`, the repo's rule for accent-coloured text (`accent-text-sites.test.ts`); it equals `--accent`
  in Low Sun and differs only where a theme lifts it for contrast.
- **A focus outside the top five** is a sixth legend row marked "your focus" (READINESS eng 2 left it to eng). The
  ring stays the top five.
- **Keep it balanced** is a button, not a span.
- **The focus arc is not clipped.** Its outer edge reaches 2px past the ring's box, which the boards' SVG clips flat;
  the block lets it draw (`overflow="visible"`).

## State reachability

- **Too early to read** is reachable only over a held reading: the block mounts last in the reading, and a deck under
  30 nonland cards cannot hold one. It is held by `strategy-block.test.tsx`, not the contact sheet.
- Every other state on the STATES table is reachable and photographed (`inventories/strategy-focus.json`), except
  nothing over the floor, held by the component test as well.
