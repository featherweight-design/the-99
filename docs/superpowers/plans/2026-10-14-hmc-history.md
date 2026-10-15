# Help me choose history: build plan

2026-10-14. Builds `docs/superpowers/design-briefs/2026-10-14-hmc-history.md` against Design's R1
(`design/design_handoff_the99_hmc_history/`, PR #1765), with the readiness audit's rulings taking precedence over Design's
files wherever they disagree (below). Everything ships behind `HELP_ME_CHOOSE_ENABLED`, which stays off in production
(production holds no Help me choose run today). Approved by the lane as the orchestrator's delegate on 2026-10-14.

## What changes, in one paragraph

A run stores the ask it was made from. A list of the player's own runs, newest first, sits on the Help me choose route
(a column beside the form from `md` up, a `History` view one press from the form's header below it). A row reopens the
results page for that run, dated and read-only, with no model call. The New deck door links to the list when the player
has a run to list. Nothing is deleted, filtered, or re-asked from History.

## Rulings that override the handoff (orchestrator, as Hugh's proxy, 2026-10-14)

1. **One past-run note for every listed run:** `A past run, read-only. Opening it again uses no credit.` The handoff's
   `It used 1 credit on <date>; ...` is dropped everywhere: it was false for a run that finished ok whose credit was
   refunded (2 of 5 answered runs on staging). No call status is read for a sentence. The note for a run that found
   nothing keeps its own line (`It found nothing, so no credit was used.`). Copy goes through `/copy-review`.
2. **Gap 2** (the next-page-failed state in the column, the every-pick-gone state on the desktop run page) is built from the
   phone specimen and the design table; no new drawing.
3. **Gap 3** (a read never starts with empty words) drops the no-words `YOUR ANSWERS` row. The row shows the words.
4. **Gap 4:** the list read reaps abandoned pending reads first; the door link counts only listable rows (ask not null); the
   page's past-run marker is a param; the list view's param is **`v=history`** (the route's existing `v` is `results` |
   `submit`), not `?view=history`.

## Decisions taken here (each the one defensible reading; flag any you overrule)

1. **The ask is one nullable `text` column on `intake_reads`**, the results-address query string for the ask
   (`serializeChooseParams` of the press's canonical params in results mode, `results: true`, so it carries `v=results`; stored without the leading `?` and without `r`, `n` and the card), written by `startRead` in
   the insert that reserves the credit. Text rather than jsonb so reopening is one parser (`parseChooseParams`) and the
   reopen link is `CHOOSE_PATH?<ask>&r=<id>&h=1`. A row with a null ask (the five staging rows, every retired-engine row) is
   never listed; production has none. Not backfilled: the words were never stored and the hash is one-way.
2. **The ask is built on the server from the parsed, tag-resolved, capped params** (`submitChoose`'s `p`), never from the raw
   client query. It reaches no prompt: nothing reads the column but the History list and the results page, which draw it
   back; the only path from a typed word to a model stays `shortlistRequest` and `judgeRequest` through `playerText`. A test
   pins that no module under `src/lib/model`, `src/lib/intake/the-read*.ts` or `src/lib/intake/read*.ts` reads it.
   The column is purged with the row (`intake_reads` is in `PURGE_ORDER`; the coverage test is table-level) and is logged
   nowhere.
3. **The list read is a keyset page** on `(created_at, id)` over the player's own rows with a non-null ask whose status is
   `ok`, `failed` with `nothing_valid`, or `pending` (the player's one pending row, G2), 20 at a time, after reaping the
   player's abandoned reads (`reapAbandonedReads`), so a dead read never sticks as `reading`. A free repeat writes no row, so
   the list has one row per distinct ask, dated by its first run.
4. **Opening a run is the results page**, not a new route: `r` names the run, the rest comes from the stored ask in the
   link, and `h=1` marks it past. The page loads the run with `loadPastRead` (the state `loadTheRead` returns plus
   `createdAt` and the stored `pool`), and draws the header meta, the note, and the aged-pick group around the shipped
   results. A pasted old link with no `h` draws as a fresh result as it does today; a run that is not the player's, or gone,
   draws the won't-open state.
5. **Aged picks come from the live search.** A pick not among the live results is `gone`; it says `you built it since` when
   the player has a deck led by that commander (the newest, linked), otherwise `no longer among the commanders we rank`. No
   snapshot (Design's call 5).
6. **The list re-reads every 3 seconds only while a row is pending**, the tuning History's own cadence
   (`HISTORY_WATCH_MS`), through a server action that re-checks the switch.
7. **`historyDate`, `historyMonth` and `FailureMark` are imported from `tuning-history.tsx`** as they are. Moving them to a
   shared module is not this feature's work.
8. **About:** two ordinary edits (`help-me-choose` caption, `credits` caption line behind `HELP_ME_CHOOSE_ENABLED`),
   no `ABOUT_VERSION` bump, the content hash re-pinned. Shipped in PR 3 with the surface that makes them true.
9. **The handoff's own tables are updated to the ruled note** in PR 3 (design table, README, STATES, copy strings), so
   `check:copy-drift` and the next reader see what ships.

## PR boundaries (each under ~20 files / ~800 lines; no stacking, each merges before the next opens)

**PR 1: the ask is stored, and a player's runs can be read (engine, dark).** `intake_reads.ask` and its migration;
`startRead` takes and writes `ask`; `beginTheRead` and `submitChoose` pass it; `loadChooseHistory` (the keyset page, the
reap, the row shape: id, date, status, parsed ask, pick count, the first three pick ids, stored pool) and `loadPastRead`;
the server actions for a page and the poll (switch re-checked, reader-scoped). No UI. Tests: the toSQL shape with
qualified columns, keyset boundaries, reaping, the null-ask exclusion, scoping to the reader, the no-prompt-path pin, and
the existing `run-store` tests unchanged. `probe:the-read` gains history assertions on local-dev. About: none.

**PR 2: the list (UI).** `ChooseHistory` (rows, month headings, empty, one, loading, failed, `Show 20 more` with its
failed-page line, the pending row and its poll, the foot), the route's `v=history` view with `‹ Help me choose`, the
`History` link on the form's back line (phone), the 380px column (320 under 1100px) beside the form (desktop), the new copy
module `helpMeChooseHistoryCopy` after `/copy-review`, and the row's link (`r`, ask, `h=1`). The opened page is unchanged
here: a row reaches today's results page. Acceptance inventory: the route at both widths, empty and populated.

**PR 3: the opened run, the door, About (UI).** The past-run header, meta line, note and `‹ History` back link; the gone
group, the undrawn-reason line, the nothing-found note, the won't-open state; the New deck door's `Your past runs ›`;
the two About edits and the hash re-pin; the handoff tables updated to the ruled note. Feature close: the
`feature-acceptance` walk across both widths and the doors.

## Surfaces and acceptance (feature-acceptance inventory, both widths)

| Route | Phone (390) | Desktop (1280) |
|---|---|---|
| `/decks/new/choose` (form) | `History` link on the back line | the column beside the form |
| `/decks/new/choose?v=history` | the list view, every state | redirects to the form (the column is on screen) |
| `/decks/new/choose?...&r=<id>&h=1` | the past run, aged, nothing found, won't open | the same |
| `/decks/new` | `Your past runs ›` under the press | closing the door's sentence |
| `/discover` | unchanged, no link | unchanged |

Import-equality: the row and the empty state are one component rendered by the column and the view
(`check:shared` on the inventory). Switch off: the route is not found, no column, no view, no link.

## Spend

None. List, open and poll are stored reads; no model call is added.
