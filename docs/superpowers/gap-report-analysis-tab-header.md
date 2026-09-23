# Gap report: Analysis tab, the header (PR D)

Table: `docs/superpowers/design-tables/analysis-tab-header.md`. I verified it row by row against
`bracket-chip.tsx`, `deck-card.tsx`, `spine-desktop.tsx`, `spine-mobile.tsx`, `bracket-mark.tsx`,
`use-header-bracket.ts` and `deck-analysis.ts`.

## Pass 1 summary

These rows match:

- **Band order:** name, then pips with commander · colour, then the chips row, then the bar, at
  both widths.
- **Status pill:** it has moved off the meta row and the commander line into the chips row.
- **Band chrome:** header root, art wash box, art, and the desktop scrim.
- **Layout:** the text column, the card-details control, and the desktop actions.
- **Rows 1, 2 and 4:** unchanged by this PR, and they match.
- **Chips row:** `flex flex-wrap items-center`, gap 8, with 6px above on the phone and 8px on
  desktop. The pill comes before the chip. The chip is drawn only with a reading.
- **Status pill:** 22px on the phone, with padding 0 7 / 3 8, radius 6, a `--border-strong` border,
  an 18% plate and status ink.
- **Chip box:** a span, 22px tall on the phone and 24px from `md`. Radius 6, gap 5, padding
  0 8 0 2, a 12% plate over `--bg`, and a 55% oklab border, both in the low rank's ink. No text
  shadow, and a 44px hit area.
- **Marks:** 22px, in chip form, each inked in its own rank. A range draws two, with the high one
  at 0.65 and no slash.
- **Label:** mono 10/11, in the low rank's ink. A single bracket shows its name. A range shows
  `{low} or {high}`, and `Split` and `splitChip` are retired.
- **The `/decks` tile:** draws the same `BracketChip`.

## Visual gaps

1. **Phone scrim ramp** (`spine-mobile.tsx`, `ArtWash labelAtPx`). The design has 0% at 41% and 73%
   at 60% (the 115 ramp). The implementation uses 143. **Declined.** The figure is keyed to the
   block's measured height at a three-line title, since the title is unclamped. The handoff's
   fixture names are one line. The new chips row adds a 6px gap and a 22px row to that block, so
   115 would leave a three-line title's top on the rising ramp. The rule this figure serves is
   "full opacity above the tallest ink" (`probe:commander-row`, `probe:art-wash`), and a
   one-line title only holds the ramp higher than it needs, which shows more art and never less
   protection. `probe:art-wash` passes every deck-header check at 143.
2. **Phone Export target** (`spine-mobile.tsx`). The design gives it min-height 44; the
   implementation set none. **Fixed** with `min-h-[44px]`. It drew 44 already, stretched by its
   `Update from a list` sibling, but only while that sibling was there.

## State reachability

- No reading (2a, 2b, 2c): the chip is absent and the pill stands alone.
- Single (2g, 2h): one mark and the name.
- Range asked (2e): marks 4 then 5, the 5 at 0.65, reading `Optimized or cEDH`.
- Range answered (2f): the declared bracket as a single chip.
- **Deferred to C2:** a stale list (2i, and the held reading in 2d). `use-header-bracket` still
  retires the chip on an edit, as #877 built it. Hugh's 2026-09-23 ruling reverses that, and it
  ships with C2's held states.

VERDICT: 0 open visual gaps (1 fixed, 1 declined), 0 state gaps (1 deferred to C2).

## Evidence

- `probe:bracket-chip` at 1300, 700 and 390: all checks pass. It now asserts the 24px chip from
  `md`, the mono label, no `Split`, and only a range's high mark dimmed. With the `md:` 24px step
  removed, it reads 22px at 1300 for both the header and the tile.
- `probe:commit-offer` at 1440, 1300, 1024 and 820: the title column keeps its width with
  `Commit as v1` offered.
- Contact sheet: `docs/superpowers/inventories/analysis-tab-header.json`, eight cells, all
  reached.
