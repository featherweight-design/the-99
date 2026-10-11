# Gap report: I got it PR 3 (the receipt, undo and the held slot)

Design-review run against the §C section of `docs/superpowers/design-tables/i-got-it.md` (210 rows:
200 properties, 10 states).

## Verify (Agent 2): 20 visual gaps, 3 state gaps

### State gaps, all fixed

| # | Gap | Fix |
|---|---|---|
| 1 | C2 claimed: under By role, a row that stayed moved into Spoken for at once | The row is pinned to the group it was drawn in until the next read |
| 2 | C3 partial: same cause | Same pin |
| 3 | C7 undo answered `alreadyReverted`: nothing revalidated, so the held slot cleared with no row behind it | That path refreshes the list |

### Visual gaps, kept deliberately

- **Gaps 1–19 are the undo warning.** It reuses the shared `ShortDeckWarning` and the app's
  dialog chrome, per the handoff README ("Reused: `ShortDeckWarning` (gains `undo`)"). The canvas
  redrew it with its own values (480px dialog, 16px sheet radius, a phone button row, an `h3`
  title). Applying them would fork the component that also draws the revert, replace, save and
  remove warnings. The table records this.
- **Gap 20, the held slot's text size**, follows the decklist's spent-slot shape (README call 8,
  "by construction"): 11.5px on the phone and 12px from `md`, not the canvas's flat 11.5px.

## Also kept

- The slot fades in over 150ms, because the row has already unmounted at revalidation. A swap
  under reduced motion.
- The finish prints as its lowercase key, as the canvas draws it.
- An undone or failed toast gets a fresh 8s.
- Focus goes to the Shopping filter when an undo settles. Focus inside the toast would hold it open.
- /collection's toast keeps its own behavior: it has no hover or focus hold.

## Confirm: 0 gaps remain
