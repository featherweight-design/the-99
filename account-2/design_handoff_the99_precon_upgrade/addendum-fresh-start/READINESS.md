# READINESS · Upgrade addendum fresh start (R2)

**Verdict (Design's read): Yellow.** The surfaces are shipped parts (intro, History row, result, wait); four gaps need engineering before build. Hugh's audit owed.

## Gaps
| Gap | What | Detail |
|---|---|---|
| **G25** | Seen per run | Store when a result was first shown (`seenAt` on the stored run, server-side so another device agrees). `useUpgradeRun`'s view becomes: pending → wait; newest done and unseen → its result; else none (the start screen). A run that lands while the flow is open is seen at once. |
| **G26** | Which deck a run went into | `readStartedRuns` returns the deck's id and name per run, not a yes. Several decks from one run: the newest. A deck since deleted: no row, so the run reads `no deck yet`. `UpgradeFlow` takes `deckOf(runId)`. |
| **G28** | Picked adds and cuts per run (#2985) | Store the unpicked cards per side on the run, server-side. Map the stored pairs to `LineItem`s for `SuggestedChangesRun` (pair reason on the add; the run must now write a short reason per cut), with `typeGroup`, `role`, price, availability and `bracketAfter`. Start (`prepareUpgradeIn` → `applyUpgradeIn`, `apply.ts`) and Apply (`applyUpgradeOnDeck`, `deck-apply.ts`) take `{ adds, cuts }`: subsets of the run, equal in count, checked on the server; Undo restores exactly what was applied. Wire `actions.pick` (store a pick) and `actions.setBracket` (read the picked set's bracket). `SuggestedChangesRun` gains a press slot (the flow's Start/Apply in the bar, no confirm) and an option to leave out You asked. |
| **G27** | Retire the old opening rules | Drop `started` as the press's opening rule and the `fresh` flag. Update the A3 / A2c / R2d tests that expect the press to reopen the newest result. |

## Ready
- `RunRow` (proposal `scratch-gen/proposal/last-run.tsx`) is History's row with one addition; `HistoryView` renders it. `LastRun` = kicker + `RunRow`, above `IntroStep` when a done run exists.
- `UpgradeFlow`: `fromStart` mirrors `fromHistory` (back link `history.backLink`, no tracker, no History link); the dashed note shows `usedNote(deck)` only for a used run, for both `fromStart` and `fromHistory` (retires `history.past`).
- The result's lists: the shipped `SuggestedChangesRun`, pick line, bar and grouping, unchanged apart from the press slot. The chips come with its pick line (`addMarkOf`), so engineering's in-flight chips change to the old swap rows is no longer needed here.

## Tests to write
- The press opens the start screen with runs kept and none pending or unseen; the row names the newest run.
- An unseen landed run opens once, then the start screen.
- A pending run opens the wait.
- The row reads `in <deck>` for a used run and `no deck yet` otherwise; History agrees.
- Opening a used run shows the note and a live press; an unused run shows no note.
- Picks: every line starts picked; unpicking a cut and an add starts or applies the rest; uneven counts turn the press off; the server refuses a set that isn't a subset of the run or isn't even; picks survive reopening.
