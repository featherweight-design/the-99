# Readiness Review — Life tracker addendum: Undo a mistaken ending

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21
**Related ticket(s):** #3082 (addendum); the original handoff's READINESS.md (PR #3001) is unchanged and not re-audited here
**Plan PR target:** PR #3079, branch `tracker-8b-table` (Undo is built into 8b's go-live PR; audited against `main` + that branch)

## Summary

The addendum is buildable as drawn. It needs **no schema change** and **no Design round**. It does need **one new server
action plus library function** (take back a saved table result), because nothing on `main` or on `tracker-8b-table`
can delete a stored result: `saveTableResult` only replaces, and its header says "only the table's own purge and the
account purge remove a result". The local half is free: `engine.undo()` already drops the last log entry, a `batch` entry
holds every change that landed together (the draw case), and the state is a pure replay, so U2's "exactly as it was"
holds by construction. Every board state (U1, U1 draw, U1 six-seat, U2, U3, U4, U5) is reachable from real fields.
The Yellow items are eng decisions the drawn patterns settle: the "who has logged" read (today's `loggedAt` is the
viewer's own log only), the save/Undo ordering race, Undo's pending and failure states, the line for a concede and for
mixed batches, a detail line on the toast, and the toast hand-off from the U5 card to `/play`. Next: the plan PR
records each as a decision.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary and non-goals are stated: last change only, no confirm, only the Result and the Last game card, only the
  device holding the game (ADDENDUM "Decisions", "Where Undo lives"). Four no-longer-offered conditions are listed
  (logged, past 6 am, Rematch, Start).
- [✅] Decisions 1–4 are marked APPROVED by Hugh 2026-11-21; the README paragraph matches the addendum.
- [🟡] No open-questions list, but one case is unaddressed: Undo on the Result of a **host-closed table still inside its
  night** (S4-ClosedResult: `closed !== null`, `stopped` false, `result.tsx:80-98`). The rules say Undo is offered while
  the log window is open, and `play/page.tsx` plays a host-closed table with a kept game, so it is reachable. See
  Yellow 7.

### 🎭 State coverage

- [✅] Drawn at phone and tablet: U1 Undo, U1 six-seat (tablet), U2 back, U3 logged, U4 six AM. U1 draw is phone-only and
  U5 is phone + desktop; the tablet draw is the same single column (`tabletize`, 440px), settled by U1-Undo-Tablet.
- [✅] Out-of-flip reversal, toast and the board-as-before are drawn (U2 phone and tablet, including the four-seat
  tablet with a prior elimination still out).
- [🟡] Undrawn transient states: Undo while the result save is still in flight, Undo's server round trip, and a network
  failure (as opposed to the drawn "refused" race, which falls to the U3 note). Yellow 3 and 4.
- [🟡] U3 on the U5 card (someone else logged, the viewer has not) is not drawn; the card has no note slot. Yellow 6.
- [✅] Past 6 am on the card needs no board: `loadKept` drops the game at `expiresAt` (`storage.ts:30-34`), so the card
  is gone entirely. U4 covers the Result.
- [✅] Rematch and Start remove the Result and the card, so "nothing needs drawing" is correct
  (`play-surface.tsx` on `tracker-8b-table`: Rematch calls `discard()`).

### 🔌 Data contract

- [✅] **Local undo.** `engine.ts:230` `undo(game)` is `log.slice(0, -1)`; `use-game.ts:44` exposes it; `play-surface.tsx`
  (8b) already comments "an undo that reopens the game and a new finish saves again" (the `savedFor` key
  `tableId:entries`, ~line 115). `reduce()` (`engine.ts:200`) turns a draw into one `batch` entry, so popping one entry
  puts back every player that change knocked out. `endedAt` is dropped by `undo` (`engine.ts:224-230`), so a reopened
  game is unstamped, as U2 needs. Monarch, initiative, round, turn and counters all come from replay.
- [🟠→Yellow 1] **The saved result cannot be taken back by any existing action.** `src/app/friends/table/result-actions.ts`
  has only `saveTableResultAction`. `rule-zero-result.ts` `saveTableResult` does `delete` + `insert` inside the table row
  lock but never a bare delete; its header (lines ~10-14) states nothing else removes a result; the only other delete is
  the purge (`rule-zero.ts:713-715`). The addendum's "Undo deletes or supersedes the record" therefore needs a **new
  action and library function**. No migration: `rule_zero_result_seats` (`schema.ts:4157-4174`) already has `saved_at`
  and `started_at`; Undo is a `delete`. It stays in `src/lib/social/` (the social-reads guard lists
  `rule_zero_result_seats`, `scripts/lib/social-reads.mjs:16`).
- [🟡] **"Anyone seated has logged it" is not readable today.** `loggedFromTableIn` (`rule-zero-table.ts`, 8b branch)
  filters `deckGames.userId = viewerId`, so `TableView.loggedAt` is the viewer's own log only; `notLoggedSince`
  (`rule-zero-result.ts`) likewise. U3's "Colin logged this game at 10:41 pm" needs a new cross-user read over the
  table's seated accounts (a `deck_games` row with `rule_zero_table_id` = the table and `created_at >=` the result's
  `saved_at`), under the table grant, in `src/lib/social/`, returning seat number and time only, never an account id.
  Yellow 2.
- [🟡] `deck_games.rule_zero_table_id` is set only when the log carries a table-seat opponent
  (`src/app/decks/actions.ts:1314`: `table !== null && tableSeats.length > 0`). A game logged from the Games tab by hand,
  with no table seats, is invisible to the "logged" check, and "log it from your deck's Games tab" (U4) is such a path.
  The addendum's claim "their `deck_games` row exists" is true only for table-linked logs. Acceptable (the prefill
  link always sets it), but the plan records it.
- [🟡] **Race with a concurrent log is not closed.** `logGame` (`decks/actions.ts:1293-1320`) never takes the
  `rule_zero_tables` row lock; `saveTableResult` does (`FOR UPDATE`). An Undo that checks "no log yet" under that lock
  can still lose to a log committing between the check and the delete. The addendum promises refusal in that race.
  Yellow 5.
- [✅] Stored-result identity exists to scope the delete: `rule_zero_result_seats.started_at` is the roster's issue time
  and the sealed roster (`snapshot.roster`) is on the device, so the delete can be keyed to this game.
- [✅] U4's window is real: `tableLoggable` (`rule-zero-open.ts`), `expiresAt` passed to `PlaySurface`, and `Result`'s
  own `stopped` timer and `trackerCopy.over.stopped` (`result.tsx:80-94`, copy `tracker.ts:156`) already implement the
  lapsed-window line the README listed as undrawn. U4 draws it.
- [✅] U5's card reads the device's kept game (`useKeptGame`, `table-game.tsx`) and `loadKept`; the roster and snapshot
  are in `game.config.snapshot`. Writing the undone game back is `saveGame` (`storage.ts:44`).
- [🟡] The line copy asks for distinctions the log does not store: **concede** is committed as a plain
  `{t:"life", seat, delta:-life}` (`sheet.tsx:87`), indistinguishable from a −n life change to 0; a **mixed batch** (life
  plus counter plus monarch landing together) has no line pattern. Yellow 8.

### 🧱 Codebase fit

- [✅] Tokens: every `var(--…)` the boards use (`--surface`, `--surface-sunken`, `--elevated`, `--border-strong`,
  `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`, `--accent-text`) exists in `src/app/globals.css`. Hex values in the
  boards are the approved base boards' own (`#14110E`, `#CF8745`, `#DEAA29`, …). The only off-theme fills, `#1A2230`
  (guest) and `#3A6AA5` on U2-Back-Tablet, were inherited from F18 and are already in the original READINESS's list.
- [✅] Reuse: the row mirrors the Result's existing `note` block (`result.tsx:150`, `data-testid="result-closed-note"`) and
  ghost/primary buttons; the Undo icon is the strip's; the card slot sits in `LastGame` (`table-game.tsx`). The toast is
  the shipped centre-slot `ToastFrame` with `role="status"`.
- [🟡] `SocialToast` (`social-toast.tsx`) takes `text` only, and `ToastFrame` (`edit-toast-frame.tsx:103-126`) has
  `title`, `detail`, `body` but `SocialToast` passes just `title`. U2's two-line toast ("Game back on" / mono
  "Undid …") needs either a `detail` field on `SocialToastState` or a direct `ToastFrame` use. The toast window is
  `useToastClock`; confirm it is the 8 s drawn. Yellow 9.
- [✅] Copy: trackerCopy conventions (`personText` parts for any name; "You" for the device owner) already fit the table.
  The "Copy (final)" table goes to `/copy-review`; wording is not a Design gap. Note the table's `Name` slots must be
  `PersonParts`, drawn through `PersonText`, because the line names another reader (`check:third-party-names`).
- [✅] The generator `scratch-gen/gen_undo.py` is design scaffolding under `design/`, never shipped (repo rule).

### ♿ Cross-cutting

- [✅] Undo's accessible name is specified (`Undo the last change: {line}`), the toast is `role="status"`, reduced motion
  is addressed (un-flip off under `prefers-reduced-motion`).
- [🟡] Not stated: focus after Undo. The Result is a focus-trapped `alertdialog` (`result.tsx:104`) that unmounts when the
  game reopens, so focus must land somewhere (the panel/strip). The plan chooses: the replayed board's first control.
  Also announce via the toast only; no extra live region.
- [✅] No performance or analytics impact: Undo is one local replay plus one small write. No analytics asked for.
- [✅] Security: the new action must be grant-checked like `saveTableResult` (session user, sealed roster, still seated,
  inside the night) and answer refusals uniformly except the one case the Result must tell apart (logged).

### ⏰ Drift from reality

- [✅] Boards were generated from the live approved boards (F10, F11, F18, S5, S6), and the components, props and routes
  they depend on exist (`Result`, `LastGame`, `useKeptGame`, `PlaySurface`, `/friends/table/[id]/play`).
- [🟡] The addendum is written against a feature whose two key files (`table-game.tsx`, 8b's `loggedAt`, `PlaySurface`
  save effect) exist only on the unmerged `tracker-8b-table` branch. The plan must rebase on 8b's final shape; any 8b
  review change to `loadTableWith`/`loggedAt` moves the "logged" read.
- [✅] The Hugh 2026-11-20 server-result ruling is consistent with Decision 3.

### 📝 Decision log

- [✅] Four numbered decisions with reasons, all approved; a copy table; engineering rules including the race outcome.
- [🟡] Not marked locked vs tentative per row, but the header states "APPROVED by Hugh 2026-11-21", so every row is locked.

## Gaps requiring a Design round-trip (Orange/Red only)

None. Every state that is not drawn is settled by a drawn pattern (see Yellow).

## Eng-side clarifications (Yellow only)

1. **New action to take back the result.** Add `undoTableResultAction(tableId, roster)` in
   `src/app/friends/table/result-actions.ts` and `undoTableResult` in `src/lib/social/rule-zero-result.ts`. Under the
   table row `FOR UPDATE` (as `saveTableResult` does), require `openRoster` ok, `maySave`, and delete **only** rows whose
   `started_at` equals this game's roster `startedAt`, so a newer game's result (another device, same table) is never
   deleted. No migration. Update the header comment that says nothing else removes a result. The return is a union,
   not `{ok}`: `"undone" | "logged" | "refused"` (a hand-off for a stale roster is `refused`, a deleted-nothing no-op is
   `"undone"`), because the Result must tell "logged" (U3 note, no toast) from a failure. Pattern: `saveTableResultAction`.
2. **The "who has logged" read.** A new function in `src/lib/social/` (not `loggedFromTableIn`, which is the viewer's own)
   returning, per seat of the game's roster, the `created_at` of that seat's first table-linked `deck_games` row at or
   after the result's `saved_at` (or the roster `startedAt` when no result was saved, e.g. `saved === "failed"`). Seat
   numbers and times only; the client maps seat to name from `snapshot.players` (decision-5 pattern). The device owner's
   own log counts at once. Feed it to the Result and to the card via `loadTableWith`'s snapshot (the `also` hook the
   8b page already uses). The U3 note uses the earliest log; its clock is the server's, never the device's
   (`LastGame`'s `CLOCK_SKEW` heuristic stays for "Not logged yet" only).
3. **Order save and Undo.** `play-surface.tsx` (8b) fires `saveTableResultAction` in an effect and ignores late results
   only client-side (`saveSeq`); the server request is not cancelled. An Undo (or Undo then re-end) can land its delete
   before the earlier save, leaving a stale result for a game that is back on. Pattern: Log is already
   `aria-disabled` + `opacity-60` while `saved === "saving"` (`result.tsx:166-170`), so Undo does the same while saving,
   and the Undo round trip serialises the next save behind it (a single in-flight promise chain).
4. **Undo's pending and failure states.** While the delete is in flight, the button is `aria-disabled` (the Log pattern).
   On a network failure the game does not reopen and an alert toast with `Try again` is raised, the shipped
   `SocialToast` refusal pattern (`role="alert"`, `retry`). A refusal for "logged" is the U3 note, per the addendum.
5. **Close the log race.** Either `logGame` takes `FOR SHARE` on the table row for a table-linked game, or Undo accepts
   a sub-second race and says so. The plan picks one; the addendum's "refused in that race" holds only with the lock.
   `logGame` is in `src/app/decks/actions.ts`, outside the tracker files the addendum names.
6. **U3 on the U5 card.** When someone else logged and the viewer has not, the card shows no Undo and the same
   `note` block U3 draws in Undo's slot (the card already has a `p` slot for "Not logged yet"). The card's "Not logged
   yet" line keeps reading the viewer's own log.
7. **Host-closed table inside its night.** The Result shows Undo above the same note (`closed*`), in the same slot under
   the winner, as long as `logOpen`; after Undo the tracker resumes as S4's "Game in progress". The closed page
   (`table-closed.tsx`) draws only `GameInProgress`, no Last game card, so there is no card Undo there.
8. **The line.** Concede commits `{t:"life", delta:-life}` (`sheet.tsx:87`); to draw "{Name} conceded" the plan adds a
   marker to that leaf (a field the replay ignores, optional so stored v1 logs still parse) or draws a concede as the
   life line. A batch mixing types (life plus counter plus monarch) names the **eliminating** change(s) only, in the same
   pattern; "to {life}" shows the true life after the change, which can be below 0, drawn as the out rows show it ("0
   life") is the existing Result convention (`copy.outLife`). Derive names, amounts, totals and the round from
   `replay(log.slice(0,-1))` plus the last entry and `state.rounds`.
9. **The two-line toast.** Add `detail` to `SocialToastState` (passed through to `ToastFrame`'s `detail`) and keep
   `role="status"`; no action. The U5 path lands on `/play` from the table page, so the toast crosses a navigation: carry
   it on the existing `?again=1` pattern (a `?undone=1` flag consumed once and removed with `mirrorUrl`), or a one-shot
   `sessionStorage` key, rather than a new store. The detail names the line computed before the log was popped, so it
   must be computed at the call site.
10. **Focus after Undo.** The Result unmounts; move focus to the board (the panel that flipped back), announced by the
    toast.
11. **Result pending while Undo hides.** A `stopped` flip while the Result is open removes Undo and shows U4's note live
    (`Result`'s existing timer), so Undo and Log share one `stopped` boolean.

## Decisions inherited

- Undo undoes the last change only; no confirmation; still offered after the result is saved (the saved result is taken
  back and re-written when the game ends again); not offered after anyone seated logs, after 6 am, or after Rematch or
  Start. APPROVED by Hugh 2026-11-21.
- Hugh 2026-11-20: a saved table result is a server record so everyone seated gets the prefill; the 8b roster and
  `startedAt` rulings (a newer game's result is never replaced by an older roster) stay, so Undo must be keyed the same way.
- The addendum's Copy table is final for `/copy-review`; no em-dashes in new copy; names go through `PersonText`.
- U2 is the shipped centre-slot toast, `role="status"`, 8 s, no action. U4 note replaces Undo only; Log and Rematch go,
  Back to Friends stays.
- Parity: every UI PR here ships phone and tablet (and desktop for the card) together, per the repo rule.
