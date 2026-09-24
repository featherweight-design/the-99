# Gap report: Home resume row, the bracket chip (addendum §C)

Table: `docs/superpowers/design-tables/home-bracket-chip.md` (131 rows). Verified by the design-review skill's
enumerate and verify passes on 2026-09-24.

## Gaps found

1. `resume-decks.tsx`, the bar track: the table gives `overflow: hidden`, and the track had none. Not visible, because
   `statusBarStyle` caps the fill at 100%, but it is a literal mismatch. **Fixed:** `overflow-hidden` on the track.

## Table amended, not the code

- The pill's `aria-hidden` row read `true (F4)` with no condition. F4 describes the chip case: the sr-only line replaces
  the pill's words only when a chip is drawn. A chip-less row has no sr-only line, so hiding its pill would silence the
  status. The row now reads "when a chip is drawn".

## State reachability

No gaps. No chip, a single mark, the 1–2 and 4–5 ranges, an unreachable range, a pair row and an empty deck are each
reached through `tileBracket` and `includeBracket: analysisTabEnabled()` on Home's query.

## Confirmation

One item was open, and it was checked by grep of the built class string: `flex-1 overflow-hidden rounded-[2px]` is on the
track. 0 gaps remain.

## Beyond the table

`pnpm probe:home` measures what no class list can, at 1440, 1300, 1200, 1180, 1100, 900, 390 and 360: three lines inside
72px, marks-only chips at 55 and 28, the plates never giving way, the count whole, bars of 80px or more, and level deck
names in a mixed pair (N4). Three mutations fail it; one (the count group's `flex-none`) measures nothing and is recorded
as an invariance.
