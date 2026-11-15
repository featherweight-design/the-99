# READINESS · Upgrade addendum fresh start (R1)

**Verdict (Design's read): Yellow.** The surfaces are shipped parts (intro, History row, result, wait); three gaps need engineering before build. Hugh's audit owed.

## Gaps
| Gap | What | Detail |
|---|---|---|
| **G25** | Seen per run | Store when a result was first shown (`seenAt` on the stored run, server-side so another device agrees). `useUpgradeRun`'s view becomes: pending → wait; newest done and unseen → its result; else none (the start screen). A run that lands while the flow is open is seen at once. |
| **G26** | Which deck a run went into | `readStartedRuns` returns the deck's id and name per run, not a yes. Several decks from one run: the newest. A deck since deleted: no row, so the run reads `no deck yet`. `UpgradeFlow` takes `deckOf(runId)`. |
| **G27** | Retire the old opening rules | Drop `started` as the press's opening rule and the `fresh` flag. Update the A3 / A2c / R2d tests that expect the press to reopen the newest result. |

## Ready
- `RunRow` (proposal `scratch-gen/proposal/last-run.tsx`) is History's row with one addition; `HistoryView` renders it. `LastRun` = kicker + `RunRow`, above `IntroStep` when a done run exists.
- `UpgradeFlow`: `fromStart` mirrors `fromHistory` (back link `history.backLink`, no tracker, no History link); the dashed note shows `usedNote(deck)` only for a used run, for both `fromStart` and `fromHistory` (retires `history.past`).
- Swap rows: chips are engineering's in-flight change; the draw assumes `AvailabilityMarker` (row, bareOne, nameless) for an owned add held elsewhere and `BuyTag` (row, collapsed) for an add to buy.

## Tests to write
- The press opens the start screen with runs kept and none pending or unseen; the row names the newest run.
- An unseen landed run opens once, then the start screen.
- A pending run opens the wait.
- The row reads `in <deck>` for a used run and `no deck yet` otherwise; History agrees.
- Opening a used run shows the note and a live press; an unused run shows no note.
