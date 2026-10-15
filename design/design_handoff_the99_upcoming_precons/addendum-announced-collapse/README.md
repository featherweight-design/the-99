# Addendum A1 · How a large reveal collapses in the Announced group

Hugh's brief, 2026-10-15. Builds on this folder's R2 handoff and on what #1808 shipped: revealed commanders draw as
the decklists' own tiles inside each set's dashed block and open card details on press. **Tile size and card details
are closed** and do not change here.

Canvas: https://claude.ai/artifact/35nVV1MNGbupjQebcDr9n9 (boards `A1-*`, bottom row).

| Read | For |
|---|---|
| `A1-Calls.dc.html` | The eight calls and the gaps. Start here. |
| `A1-Phone.dc.html` | 390: 15 collapsed (P1), 15 expanded (P2), 2 (P3), 4 (P4, threshold), 5 (P5, first to collapse, focused). |
| `A1-Desktop.dc.html` | 1300: 15 collapsed (D1), 15 expanded (D2), 6 (D3, one row), 2 (D4), 12 (D5, threshold). |
| `A1-Rows.dc.html` | List view at 390 and 1300 with Star Trek opened: unaffected. |
| `STATES-announced-collapse.md` | The rule as a table. |
| `announced-collapse · copy strings.ts` | Proposed strings for `/copy-review`. |
| `art/` | The card images the boards use (stand-ins, see G4). |

Drawn on the shipped `/decks/precons` in tiles view, Kamigawa theme, group open.

## Calls

1. **Collapsed count: one row.** As many tiles as the grid has columns at that width: 2 at 390 (and under 480), 4 at
   900, 6 at 1300; whatever `PRECON_TILES_CLASS`'s auto-fill lays out in between. Read from the grid, never a ragged
   half row.
2. **Threshold: three rows.** Collapse when `revealed > 2 × columns`: 5+ at 390, 9+ at 900, 13+ at 1300. Two rows
   always stay whole. The common case (2) and one row's worth never draw a control.
3. **The control is `SheetGroupToggle`** (`src/components/ui/sheet-group.tsx`), as the Change commander and swap
   sheets use it: `Show all 15` / `Show fewer`, 12.5px medium accent, disclosure chevron, `aria-expanded`,
   `aria-controls` = the set's grid. Under the grid, inside the dashed block, left-aligned with the tiles (no 43px
   indent), 44px at 390 / 34px from md. It drops its own bottom rule inside the block (G1).
4. **Expand and collapse in place, no animation.** Focus stays on the toggle. On Show fewer, if the toggle would land
   above the window's top, scroll it into view (`block: "nearest"`). Hidden tiles are `hidden`. Card details' Prev/Next
   still pages every commander of the set.
5. **Memory: the visit, not across visits.** Per set code, held with `useAnnouncedVisit` in the list view, so closing
   and reopening the group or switching views keeps it. A new visit starts collapsed. Nothing stored, no cookie; the
   server draws collapsed.
6. **A search or colour filter on: nothing collapses.** The reader asked for those matches.
7. **Desktop collapses too, by the same rule.** Fifteen at 1300 is three rows (~1,070px of block); collapsed ~430px.
8. **Rows view is not affected.** The row is its own disclosure, closed every visit; its strip scrolls at 390 and wraps
   from 900 (two lines for fifteen at 1300).

## Measured from the code

| | 390 | 1300 |
|---|---|---|
| Tile (grid 332 / 1164) | 161 × 283 (art 225 + caption 56 + border) | 184 × 309 (art 257 + caption 50 + border) |
| Star Trek block, whole | ~2,480px (8 rows) | ~1,070px (3 rows) |
| Star Trek block, collapsed | ~430px | ~430px |

## Gaps for engineering

- **G1** `SheetGroupToggle` appends `border-b` outside its merge, so a caller cannot drop it. Add one optional prop
  (e.g. `rule={false}`), default unchanged for the two sheets.
- **G2** The server can't know the column count between breakpoints. Engineering decides the no-jump first paint; one
  way is CSS hiding tiles past the first row at each breakpoint's column count, refined once mounted.
- **G3** Card details opened from a visible tile and paged to a hidden one returns focus to an element that can't take
  it. Confirm `CardDetailProvider`'s return-focus walk finds the set's toggle (its `aria-controls` names the grid) from
  a hidden `li`, or point it there.
- **G4** Card images and names are stand-ins cropped from Hugh's precon-grid screenshots; Star Trek's real fifteen
  aren't readable from the design environment.
- **G5** No About entry: a layout change to a shipped surface, not a feature (the cosmetic-change rule).
