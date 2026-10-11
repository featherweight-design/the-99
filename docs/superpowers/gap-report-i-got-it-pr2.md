# Gap report: I got it PR 2 (the way in and the confirm)

Design-review run against `docs/superpowers/design-tables/i-got-it.md` (355 rows: 331 properties,
24 states). §A11 (the details link) is PR 4 and §C is PR 3; both are out of scope here.

## Verify (Agent 2): 9 visual gaps, 2 state gaps

| # | Gap | Fix |
|---|---|---|
| 1 | Phone focus ring wrapped the 44px button stack | Ring drawn on the plate (`group-focus-visible`), button outline off |
| 2 | Row did not dim while its write was pending (A8, B10) | Row shell at opacity 0.6 while pending |
| 3 | Key switched grid to row at `md` | Switches at `lg` |
| 4 | Key phone spacing | 10px above, `0 0 10px` padding |
| 5 | Title was `h2` | `h3` (the dialog's only heading) |
| 6 | Grabber margin −2px | 2px |
| 7 | Tile art radius 10px | 9px, behind `tiles="confirm"` so the Add cards sheet is unchanged |
| 8 | Tile row padding | `4px 4px 2px`, confirm only. Overflow stays `auto` (see below) |
| 9 | Add used native `disabled` | `aria-disabled`: focusable, a press writes nothing |

## Confirm (Agent 3): 0 gaps remain

## Kept deliberately

- The confirm turns from sheet to modal at `md`, as the app's confirm modal does. Rows switch at `lg`.
- Printing tiles reuse the picker's tile text, not a code-over-set layout.
- The desktop tile row scrolls instead of clipping: a card can have up to 57 printings on Hugh's
  decks (median 5), and the 520px modal fits about four 104px tiles.
- The table's A5/B1/B7 rows were corrected to the plan's ruling: a sold-out row presets nothing.
