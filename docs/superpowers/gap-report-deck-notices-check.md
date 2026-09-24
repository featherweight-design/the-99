# Gap report — Deck notices: the check before the overview (plan PR 7)

Table: `docs/superpowers/design-tables/deck-notices-check.md`. Agent 2 verified 8 visual gaps and 0 state gaps; every
state (6a, 6b, 6c, H3, F13) is reachable, computed by the server and wired to the right branch.

## Fixed in this PR

| # | Where | Gap | Now |
|---|---|---|---|
| 6 | `analysis-empty.tsx`, `analysis-banner.tsx`, `synopsis-overview.tsx` (CheckLine) | `See which →`: the dotted rule ended at the label; the arrow sat 6–8px away, unruled | one ruled box holds the label and the arrow, `--accent` |
| 8 | `synopsis-overview.tsx` (CheckLine row) | the withheld row wrapped at every width | no wrap below `md`; wraps from `md` |

## Ruled: the credit note's slot, as shipped

HANDOFF §6 puts the check note in "the credit note's slot … same placement and form as the credit note". The note
reuses that slot unchanged, and this PR touches none of these classes, so each of the rows below is the slot as the
synopsis round shipped it rather than a new drawing. Changing them here would move the credit note too.

| # | Where | Frame | Shipped slot |
|---|---|---|---|
| 1 | empty-state note, 390 | line-height 1.5 | 1.55 |
| 2 | empty-state note, 390 | 10px below Analyze | 6px (the row's gap) |
| 3 | empty-state note, 1300 | `flex: 1 1 300px` | sized to content, `max-width: 340px` |
| 4 | banner note, 390 | line-height 1.5 | 1.55 |
| 5 | banner note, 1300 | `flex: 0 1 300px` | `max-width: 340px` |
| 7 | Overview section, 390 | gap 8px | 7px |

## Outside the table

- The overview modal's Re-analyze carries the check note's text but no `See which →`. The modal has its own close
  and the sheet would open over it; left as the text alone.
- Deviation 1 (the banner note carries `See which →` although the 6b frames draw it plain): HANDOFF §6's text names
  both presses, and it is the spec the frames illustrate.

Agent 3 (confirm): 0 gaps remain.
