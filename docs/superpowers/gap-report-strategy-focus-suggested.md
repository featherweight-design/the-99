# Gap report: strategy focus in Suggested changes (PR 4b)

Handoff `design/design_handoff_the99_strategy_focus/` (Focus-Flow 2 to 4). Property table:
`design-tables/strategy-focus-suggested.md` (94 rows, 17 tables). The verify pass found 4 visual gaps and 0 state gaps.

| # | Gap | Resolution |
|---|---|---|
| 1 | Focus chip's value in `--fg-muted` | Fixed: `--fg` on the focus chip only; every other chip as shipped |
| 2 | Focus chip figures do not run on across additions (`11 → 12`, `12 → 13`) | **Kept, ruled.** d9's call (c), READINESS eng 3: before → after the ONE addition, since a player applies them in any order |
| 3 | Focus row radius 7px | Fixed: 8px |
| 4 | Focus row horizontal padding 8px | Fixed: 12px |

## Deliberate deviations (not gaps)

- Accent text through `--accent-text` (the repo's guard); borders in `--accent`.
- The focus row keeps the shipped read row's height, type and status dot (the manifest-affordance addendum retired the row
  fill the board still draws).
- The off-plan cut chip leads a cut's chips and the model's other citations stay; only a restatement of the same point is
  dropped (`strategyChips`). Hugh ruled the chip in (call d); losing a cut's own evidence to it was not asked for.
