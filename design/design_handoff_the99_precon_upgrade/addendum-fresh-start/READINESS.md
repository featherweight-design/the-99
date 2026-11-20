# Readiness Review — Upgrade this precon, addendum fresh start (R2, with #2985)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** #2985 (keep or reject individual swaps), PR #2994; in flight: #2976 (open, see Drift)
**Plan PR target:** TBD

## Summary

Buildable as drawn. Every surface is a shipped part: `IntroStep`, `HistoryView`'s row, `WaitView`, `UpgradeFlow`'s result head and the shipped `SuggestedChangesRun`. Every name the handoff cites exists on the rebased tree: `useUpgradeRun`'s `fresh` flag and `started` opening rule, `fromHistory`, `history.past`, `readStartedRuns`, `decks.built_from_upgrade_id`, `prepareUpgradeIn`/`applyUpgradeIn`, `applyUpgradeOnDeck`/`undoUpgradeOnDeck`, `pickCap`, `addMarkOf`, `actions.pick`/`actions.setBracket`, `LineItem.typeGroup`/`role`/`picked`/`bracketAfter`, and the `inFlight` refusal. **This handoff does draw #2985**, as R2: adds and cuts are picked separately in Suggested changes' own results, not per pair as the issue's Approach proposed. That part is buildable, but it is the larger half of the work. It needs a migration, a change to the run's model reply (a reason per cut), server-checked subset Start and Apply, and two props on `SuggestedChangesRun`. Design names all of these as gaps G25 to G28. None needs a Design round-trip. The plan PR records the clarifications below.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Calls 1 to 12, `What doesn't change`, `Not drawn` (steps, failed last run) and the must-nots set a clear boundary. The two open questions for Hugh are logged and default to "left off".
- [✅] #2985 is in scope explicitly (R1c folds it in; R2 redraws it). R2 retires R1b's swap rows and R1c's per-pair toggle.

### 🎭 State coverage

- [✅] STATES table: pending → wait; landed and unseen → result once; kept runs → start screen; none → intro. Each has a board (F1 to F4).
- [✅] Picks: as found, mixed, uneven, bracket pick dropped, none picked. All of these are `SuggestedChangesRun`'s shipped bar lines.
- [🟡] Phone and desktop: drawn for the start screen (applied, open), opened result (applied, open, mixed), wait, landed, History and the first-time intro. Deck page: start screen phone only (`fs-deck-open-p`), opened and mixed at desktop. `uneven` is phone only and `missed` desktop only. These are shipped bar and band layouts, so the other width follows the drawn one (clarification 6).
- [🟡] Not drawn: what a cut shows when it carries no reason, which is true of every run kept today (clarification 2).

### 🔌 Data contract

- [🟡] **G25 seen**: `precon_upgrades` has no `seen_at`. A new nullable column, written when the result is shown (server action). Migration.
- [🟡] **G26 which deck**: `readStartedRuns` returns `Set<string>`. It must return `{ deckId, name }`, newest per run. This reads `decks` only, so no schema change. `PanelRun.started` becomes a deck ref, and `deckOf` is new on `UpgradeFlow`.
- [🟡] **G28 picks**: there is no pick store on the run. The handoff calls for unpicked cards per side, server-side, which means a new jsonb column on `precon_upgrades` (e.g. `unpicked text[]`/jsonb of line ids). Migration. Today `UpgradePair` has one `reason` (the add's) and `upgradeReplySchema` (`prompt.ts`) asks for one per pair. A per-cut reason means changing the reply schema and the prompt. Today `PanelCard` holds `cmc`, `identity`, facts and owned. `LineItem` also needs `typeLine`, image, `typeGroup`, `role`, price, availability and `bracketAfter` per card, so the panel read grows.
- [🟡] Start and Apply take `{ adds, cuts }`. Today both rebuild from `run.pairs` (`apply.ts:75`, `deck-apply.ts:77-118`), and `upgradedDeck` loops pairs. The engine changes to apply an add set and a cut set of equal size, each a subset of the run, checked server-side. The deck page's undo snapshot (`preconUpgradeUndo`) must record the applied subset so Undo restores exactly that.
- [🟡] `actions.setBracket` for the upgrade: `bracketsOf(list, pairs)` reads over pairs. It needs an adds/cuts form. This is the app's own read and makes no model call.
- [✅] Pending, `inFlight`, `listChanged`, `refunded` (short) and the landed pulse are all real fields today.

### 🧱 Codebase fit

- [✅] Tokens `--border-strong`, `--accent-text`, `--fg-faint`, `--fg-muted`, `--success` and `--fg-disabled` exist in `src/app/globals.css`. No new colors, sizes or fonts.
- [✅] Reuses `SuggestedChangesRun` itself, not a fork (must-not). Its props are tuning-shaped (`live`, `report`, `permits`, `figures`, `drift`, `ask`), so the upgrade needs an adapter that maps a run to them (clarification 4). The scratch patch shows the two additions: a `press` slot in the bar, and You asked left out when `press` is set. `seedSet` is scratch only and does not ship.
- [✅] Copy: three new strings plus `usedNote`, which retires `history.past`. Every list, tally and bar string is `suggestedChangesV2Copy` as shipped. DRAFT, so it goes through `/copy-review`.

### ♿ Cross-cutting

- [✅] Lists, picks, switch and bar keep `SuggestedChangesRun`'s shipped a11y and announcements. `RunRow` is History's shipped button row.
- [🟡] Performance: the panel read grows per card (type line, art, role, price, availability). Keep it in the existing `readUpgrade` batch, with no per-row queries.
- [✅] No new analytics asked for.

### ⏰ Drift from reality

- [✅] Rebased cleanly on e47c3e709, which includes #2977 (the scrolls cue dropped from result-view). Nothing in this handoff depends on that cue.
- [🟡] #2976 (owned adds draw the allocation chip in `result-view.tsx`) is still **open**. R2 replaces result-view's swap rows with `SuggestedChangesRun`, whose pick line draws the chip through `addMarkOf`. #2976's row change is superseded by this build. Its `run.ts` ownership read may still feed the line items (clarification 7).
- [✅] A3 / A2c / R2d tests that assert "press reopens newest result" exist and G27 retires them by name.

### 📝 Decision log

- [✅] R1b, R1c and R2 are dated with Hugh's words. Status: approved by Hugh 2026-11-18. Locked calls are numbered, and the open items are under `Open for Hugh`.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **Two columns on `precon_upgrades`** (one migration): `seen_at timestamp null` (G25) and the per-run picks (G28, e.g. `unpicked jsonb not null default '[]'`, line ids `a-<oracle>` / `c-<oracle>`). Rows that exist today read as "seen" (backfill `seen_at = finished_at`), so no old run reopens on its own after deploy. Picks default to all picked.
2. **Cut reason on old runs**: runs made before the reply schema change have no cut reason. The cut line draws with no reason, following `SuggestedChangesRun`'s line when a rationale is empty. Do not reuse the add's reason (G28 puts the pair's reason on the add) and do not invent one. New runs: `upgradeReplySchema` gains `cutReason` (same 1 to 240 char bound), and the prompt asks for it.
3. **Subset Start/Apply**: `PreparedUpgrade` and `applyUpgradeOnDeck` take `{ adds, cuts }`. The server refuses a set that is uneven, empty, or names an id outside the run's pairs. The locked-cut check runs over the picked cuts only. `preconUpgradeUndo` stores the applied subset.
4. **Adapter, not fork**: one mapper from `PanelRun` to `LineItem[]` (as `scratch-gen/fspatch.diff` sketches). `SuggestedChangesRun` gains `press` and leaves out You asked when it is set. `permits`/`ask.bracket` come from `bracketAfter`/`bracketTarget`, and `live`/`report`/`drift` are null. `pickCap`'s n is the run's pair count.
5. **Seen** is written by the server when a done result is shown in the flow, including one that lands while the flow is open. `useUpgradeRun`'s view becomes: pending → wait; newest done and `seen_at` null → its result; else start screen. Drop `fresh` and `started` as opening rules (G27).
6. **Width parity**: the deck page's start screen at desktop follows the precon page's `fs-open-d` inside the band. `uneven` at desktop and `missed` on a phone are the shipped bar lines at the drawn widths of `mixed`.
7. **#2976**: either close it as superseded, or merge it and accept that this build replaces its rows. Do not build both row styles.
8. `RunRow` is one component for the start screen and History, with the deck name wrapping on a phone (call 4).

## Decisions inherited

- Every return opens on the start screen. Only an unseen landed run opens by itself. No row while a run is pending.
- Adds and cuts are picked separately (R2, Hugh 2026-11-18), not pairs. Every card starts picked, and counts must match to start or apply (deck stays at 99).
- Picks are free, need no confirm and are stored with the run. Opening a past run uses no credit, and its press stays live while the list fits (`listChanged` keeps it off).
- One press, in the bar. Try another strategy moves below the lists. You asked is left out.
- A run in two decks names the newest. A deleted deck reads `no deck yet`.

**Flags (product calls, not gaps):** a migration (two columns on `precon_upgrades`), and a model prompt and reply schema change (a reason per cut: a few more output tokens per run, no new model call). No new feature switch (rides Upgrade this precon's switch). No new spend beyond those tokens. No email.

## Design's own read (kept)

# READINESS · Upgrade addendum fresh start (R2)

**Verdict (Design's read): Yellow.** The surfaces are shipped parts (intro, History row, result, wait); four gaps need engineering before build. Hugh approved R2 (2026-11-18).

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
