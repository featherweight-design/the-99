# Readiness audit (independent) - tablet sheet and coin toss

**Verdict:** Orange (small Design round-trip; Design's own verdict was Yellow)
**Audited:** 2026-11-22, cold read against origin/main 62e922c (tracker files unchanged since 6aaf82a)

## Summary

All four of Hugh's asks are drawn: larger art (D1 to D6), a half sheet (410 of 820 at 1180x820 and 820x1180, E1 for the short end), Table in the tab row (Tabs board), the 3D coin with a reduced-motion state (Coin board). The proposal touches four source files and no data, schema, server action or copy. One drawn state is broken, so UI waits on one small addendum.

## Gap for Design (Orange)

- **Partner card clips its steppers at five across (D3, Max).** Five opponents on 1180 px leave about 220 px per card; a partner card splits it into two ~104 px halves, but `damageOne` is 44 + 52 + 44 = 140 px. On D3 the first half's minus and the second half's plus are cut off at the card edge, so a partner commander's count cannot be changed from its own half. The board draws the defect, so this is not an eng ambiguity: the nearest pattern (shipped F06 stacks) does not say whether the halves stack the stepper vertically, shrink it, or the card spans two columns. Ask Design for one resolved partner card at 5-across (and at 4-across).

## Phone and desktop

- Phone: sheet and F06 cards unchanged, tab fix invisible, coin shared code at 72 px. OK.
- Desktop: classed as tablet by `useTable`, so it gets the half sheet (D6). OK. The 380 px floor means short windows exceed "half"; acceptable, stated.

## Data and server

None. Game state, engine, storage and the one result write are untouched.

## Eng clarifications (Yellow level)

- `dice-roll.test.tsx:49` pins `coin-flip`; line 50 also asserts `--ry`, which becomes `--rx`. Design flagged only the class. Both change with the build.
- `sheet.test.tsx` needs a `tablet` case (veil click closes, half-sheet class, DamageArt cards); no existing test pins `ml-auto`.
- `coin-flip` is referenced only by the test; `dice-land` only by `dice-roll.tsx`, so deleting both keyframes is safe.
- End game inside the half sheet is undrawn; the shipped grid fits per Design's arithmetic. Eng to verify at six seats.
- The `damageHint` partner line is accurate on phone but on tablet a partner pair is one split card. Leave to copy-review.
- `scratch-gen/` is reference only; never import.

## Files the build touches

`src/components/tracker/sheet.tsx`, `src/components/tracker/dice-roll.tsx`, `src/components/tracker/play-surface.tsx` (two `tablet=` props), `src/app/globals.css`, plus `sheet.test.tsx` and `dice-roll.test.tsx`.

## PR split

Under ~250 lines, so one PR is allowed; cleaner as two independent PRs (no stack): (1) coin toss: dice-roll, its test, play-surface props, coin keyframes; (2) tablet sheet: sheet, its test, sheet keyframes, tab row fix. Tab row fix may ride in either.
