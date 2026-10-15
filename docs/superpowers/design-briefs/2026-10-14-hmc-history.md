# Help me choose history: review past runs

Design brief, 2026-10-14. Asks for a Design round on one surface: a place to see the Help me choose runs a player has
already made, and open one again. It is item 4 in the Design queue. Hugh's rulings are the three in "Locked" below; this
brief says what the code stores today, what staging holds, what engineering proposes, and what Design owns.

## The problem

A Help me choose run that used the model costs a credit and takes about 16 seconds (the one settled run on staging that
recorded its duration read 16s). Its answer is up to ten commanders, each with a line on why, and today the only way back
to it is the address of the results page.

- **There is no list.** Nothing in the app lists a player's past runs. A run is reachable only from the browser's own
  history, a bookmark, or a link pasted back in. Close the tab and the paid answer is out of reach, although the database
  holds it.
- **The question is not kept with the answer.** A run's row stores a hash of the ask, never the words or the answers. The
  words, the colors, themes, sets, budget, bracket and build-around card live in the results page's address (`w`, `c`, `m`,
  `t`, `tj`, `p`, `pool`, `b`, `k`, `a`, `r`, with `n` for *Not used* and `v` for the screen) and nowhere else (`src/lib/intake/params.ts`). So even an engineer with the row cannot say
  what was asked. A list of past runs that shows "the question" needs the ask stored, which is new data (see
  "What engineering proposes").
- **Asking again is not the same as opening again.** A repeat of the same ask is free since #1717, but only while
  everything the answer depends on is unchanged: the words, every filter, the prompt version, the commander list, the
  player's pool, collection and decks (`readFingerprint`, `src/lib/intake/the-read.ts:397`). Add one card to the
  collection and the same words are a new ask that costs a credit. A reader cannot see that line, and the brief asks Design
  to draw a surface that does not blur it.

The wish: a player who got a good answer last week can find it, read it, and carry it into a new deck without paying again.

## Surfaces

Help me choose is one route, `/decks/new/choose`, behind `HELP_ME_CHOOSE_ENABLED` (off: the route is not found). The app
reaches it from two doors, each drawn only where its host passes the switch (`src/components/intake/help-me-choose-door.tsx`):

- **New deck** (`/decks/new`, the create picker): a card at the top of the list column, above the search.
  Home has no door of its own.
- **Commanders, Discover lane** (`/discover`): a link on the rack's result line carrying the colors lit there. At the
  wide width it sits at the line's right end; on a phone it takes its own 44px line under the count.

Design owns where history lives; the candidates, in order of how little they add:

1. **On the route itself** (`/decks/new/choose`), as the form's neighbour: it is where a player already is when they want
   to ask again, and a past answer is next to the new question.
2. **A sheet or section on the New deck picker**, beside the door.
3. **A page of its own**, reached from both doors.

Either way it must draw at 390 and at desktop, in the same PR. Where the doors reach it must be the same component at
both, not two. The Discover door only carries colors, so it is the weaker place for history; say if it should link there
at all.

## What exists today

All paths are on `main`; line numbers were read on 2026-10-14 and move.

**What a run stores** (`intake_reads`, `src/db/schema.ts:2603`)
- `id`, `user_id`, `created_at`, `settled_at` (since #1648, 2026-10-13; null on earlier rows), `status`
  (`pending`, `ok`, `failed`, `cancelled`), `error_class`, `phase` (`shortlist` or `judge` while pending), `model`,
  `model_call_id` (the credit's unit).
- `words_hash`: the ask's fingerprint, a SHA-256. It is one-way. It cannot be turned back into words.
- `result`: the settled answer. Up to ten picks, each `{ oracleId, reason }`, where `reason` is a list of parts, either
  `{ text }` or `{ deck: <commander oracle id> }` (a deck is named by its commander and resolved to a name at draw time).
  Plus two counts, `pool` (commanders the player's pool held) and `weighed` (commanders the judgement weighed in full).
  About 1.6 to 2.0 KB a row on staging.
- **Not stored:** the words, any answer, the tagged cards, the *Not used* list, the shortlist, the model's raw replies.

**The deeper-read results.** A run is two model calls (a shortlist, then a judgement; `runTheRead`,
`src/lib/intake/the-read-run.ts`). Only the judgement's picks are kept. A read that finds nothing is stored with
`status = failed`, `error_class = nothing_valid` and its empty `result`, and its credit is refunded. A failed or stopped
read has no answer and no charge. Only one read per player can be pending at a time.

**The free repeat (#1717).** `startRead` (`src/lib/intake/run-store.ts:236`) looks for a settled `ok` or `nothing_valid`
row with the same `words_hash` for this player, under the per-player lock and before it reserves anything. If one
exists it returns that row's id and its result and reserves nothing, even for a player with no credit left. So the stored
answer already serves two things: the repeat, and (by id) the page that draws it.

**What is viewable, and where.** `loadTheRead(readId, userId)` (`run-store.ts:71`) reads one run by id, scoped to the
reader (another player's id reads as none). The results page calls it when the address carries `w` and `r`
(`src/app/decks/new/choose/page.tsx:108`). Nothing lists runs; nothing reads `intake_reads` for a list. The admin pages
read model spend per feature, not runs.

**What opening one does.** The results page does not replay a snapshot. It runs the free search again from the address's
answers, then orders the rows by the stored picks (`reorder`, `the-read.ts:382`), and draws a pick's reason only when
every deck the reason names still resolves (`reasonDrawable`, `choose-row.tsx:44`). So a reopened run today:
- loses a pick whose commander the player has since built (`isCandidate` excludes commanders the player already has a
  deck for, `search.ts:218`), or whose index state is no longer ok;
- loses a reason that names a deck since deleted (the row keeps its place with no line; the head's sub says fewer lines);
- shows commander names, art and fit figures as they are now, not as they were.
This is the right behaviour for a live answer and an open question for a record. See Open question 5.

**Legacy rows.** The retired one-call engine stored `chips` (`{ chips, notUnderstood, notUsed }`) and no `result`.
`loadTheRead` returns `none` for any row with chips and no result, so they are unreadable by design. They hold no words
either. Nothing writes them now.

**The deck tools' History tab, as a pattern** (`src/components/decks/tuning-history.tsx`, copy
`src/lib/copy/tuning-hub.ts:63-100`, read `src/lib/tuning/history-read.ts`). It is the closest thing in the app:
- A list of runs of every Tuning tool, newest first, kept for as long as the deck is. A chip row filters by tool
  (`All`, `Suggested`, `Mana`, `Cuts`). Rows show the tool, the date, a tier (`free`, `1 credit`, `deeper look`), an
  outcome (`ok`, `refused`, `failed`, `stopped`, `running`) and a one-line summary.
- Paged by keyset, 20 at a time, with `Show 20 more` (`HISTORY_PAGE`).
- A row opens the run **in its own tool**, read-only, under a note: `A past run, read-only. The list has changed by N
  cards since; nothing here can be applied now.` Lines are re-checked against the deck as it is now. A `‹ History` link
  goes back.
- Empty (`No runs yet` and a sentence), filtered-empty, load-failed (`Couldn’t load` with `Try again`) and
  a past run that will not open (`This run didn’t load. Try again from History.`).
- It has no delete. Runs are the record.

Two differences matter. History is scoped to one deck, so it needs no per-row name; a Help me choose run belongs to an
account and needs a name, which is the question. And a Tuning run has a deck to be re-checked against; a Help me choose
run has the player's pool, which is what moved.

## What staging holds

Read-only, staging (`br-polished-pond-a6e63y0b`), 2026-10-14. Production was not read.

`intake_reads` holds **8 rows across 2 accounts**, 2026-09-26 to 2026-10-13.

| | Account A | Account B | Total |
|---|---|---|---|
| Two-step runs with an answer (`ok`, `result` set) | 4 | 1 | 5 |
| Legacy, `ok`, chips only | 1 | 0 | 1 |
| Legacy, `failed nothing_valid`, chips only | 2 | 0 | 2 |
| All rows | 7 | 1 | 8 |

- **Runs per account:** median 4, max 7 over all rows; median 2.5, max 4 over rows with an answer. Two accounts is not a
  distribution, so read these as "a few". Design for 0, 1, a handful and, because a credit is 5 or 10 a day, a
  player who stays at it for a month.
- **Every row has a different `words_hash`.** No staging account has repeated an ask, so the free repeat has not been
  exercised by a real player; there is no frequency to design against.
- **An answer:** 8, 8, 9, 9 and 10 picks. `pool` ranges 164 to 3,446 (164 is an own-cards pool), `weighed` 10 to 39.
- **Two-step runs began 2026-10-12.** Everything before it is a legacy row. Of the 5 answers, 4 are from 2026-10-12 or
  13, so a list drawn today reads "this week" for every row.
- **Legacy rows are 3 of 8 (37%) on staging** and none can be opened. Production has a different split; if the list is
  built from `result is not null` they are never seen.

## What engineering proposes

Leans from the code as read on 2026-10-14. The plan confirms or changes each before Design draws against them.

1. **Store the ask with the run.** One additive column on `intake_reads` holding the ask as the results address carries it
   (the `ChooseParams` that `serializeChooseParams` writes, minus `r`; the plan decides that `n` and the card are left out), written by `startRead` in the same insert. Without
   it there is no question to list and no address to reopen from. Every existing row has none, so the 5 answered runs on
   staging hold a result and no ask. Engineering decides whether such a row is hidden or listed under a generic line;
   Design should draw the row both ways only if it asks for the second.
2. **Reopen by id, not by fingerprint.** Opening a past run reads `loadTheRead(id)`, which is free and does not depend on
   whether the pool moved. Only *Ask again* touches the fingerprint, and it may or may not be free (see the next lean).
3. **Listing is a keyset read of the player's own `ok` and `nothing_valid` rows**, newest first, 20 at a time, on the
   History tab's model (`history-read.ts`). Failed, stopped and pending reads have no answer and are not rows in the list;
   a pending read is the waiting panel's, not history's.
4. **No "still free" badge.** Whether a repeat is free depends on the pool, the collection and the decks, which are read at
   press time (`loadTheReadInputs`) and cost a pool read per row to work out. The list does not compute it. *Ask again*
   re-submits the stored ask through the normal press, which states its own cost the way the form does today.
5. **A snapshot or a live re-draw.** The cheap path is today's: reopen runs the live search and re-orders by the stored
   picks. A snapshot would store each pick's commander name and color identity beside it. Engineering leans live, with the
   absence states below, unless Design wants a record.

## Constraints

- **Reading never calls the model.** Listing and opening a run are reads of stored rows. Neither reserves a credit, and
  neither depends on a credit being left. (The one exception to "moves no allowance" is a pending read past the reaper's
  cutoff: opening or listing it reaps it and returns its credit, as the results page does today.)
- **Per account.** A run is read by its owner only (`loadTheRead` scopes by `user_id`); no friend, pod or admin surface
  draws one. `intake_reads` is purged with the account (`PURGE_ORDER`).
- **A run's reasons name the player's decks by commander.** A reopened reason that names a deleted deck draws no line
  today (`reasonDrawable`); the surface must decide what a row with no line says.
- **One pending read at a time.** While a read is pending the player cannot start another and cannot reopen the pending
  one as a record. The list's relation to a read in flight is Design's call.
- **Hit targets and keyboard.** Rows are real links or buttons, 44px minimum on the phone, with a visible focus ring.
  The list is a landmark with a name.
- **Screen reader.** A row's accessible name carries the question and the date; opening a run announces that it is a past
  run and read-only, as the History tab's note does.
- **Switch.** Everything here is behind `HELP_ME_CHOOSE_ENABLED`. A player with the switch off sees no door and no list.
- **Model input.** Re-showing the words a player typed is not a model input. Showing them back must not re-send them
  anywhere; only *Ask again*, through the normal press and `playerText`, does that.

## Locked

Hugh's rulings for this item:

1. **Reopening a past run is free.** It is stored, so it makes no model call and spends no credit.
2. **A past run is read-only.** It can be read and its commanders carried into a new deck; its answers and words cannot
   be edited in place (a changed answer is a new ask, as the form works today).
3. **Runs are per account.**

## Open for Design to call

1. **List or grid.** A list of rows, or a grid of cards. Consider that a run's identity is a sentence of the player's own
   words, the date and up to ten commanders, which are art. The History tab is a list; Discover is a grid of commander
   tiles. Say which, and why.
2. **What a row shows.** Candidates, to be drawn rather than all included: the question (the words, or when there are
   none, a line built from the answers: colors, themes, budget), the date, the top picks (names or art, how many), the
   count (`9 picks`), whether it found nothing, how many credits it cost (none are visible today). Draw the full row and the sparse
   one, for a run whose ask has filters and no words.
3. **Reopening versus re-asking.** One press opens the run (free, read-only). Is *Ask again* a second control on a row, a
   control inside the opened run, or absent (the player edits the answers from the opened run, as *Change answers* does
   today)? If it exists, draw how it says it may cost a credit and may not, without the list computing which.
4. **Deleting a run.** The History tab has none. Options: no delete (runs are the record); a delete per row; a clear-all.
   Constraints: a delete removes the stored answer, so the same ask again costs a credit, and it never returns the credit
   already spent. If Design draws a delete, draw the confirm, and how it says that.
5. **A run that has aged.** The opened run is live, so some picks may have gone (the commander is now built, or the index
   moved) and some reasons may not draw (a deck was deleted). Draw how the opened run says "N of 9 picks are still open to
   you" or equivalent, what a pick that went looks like, and whether a snapshot is worth asking engineering for.
6. **Where it lives, and how a player finds it.** Options in "Surfaces". Include a result of a read in flight and a
   player whose switch is off. Say whether the Discover door links to it.
7. **Nothing-found runs.** A run that found nothing is stored and was refunded. List it (so a player does not ask it
   again) or hide it?
8. **Ordering and filtering.** Newest first is assumed. With at most a handful of runs, say whether any filter or search
   is warranted. If the list is long, 20 at a time with `Show 20 more` is the shipped pattern.
9. **The carried-over answer.** Opening a run restores the question and the answers; picking a commander carries them to a
   new deck as it does today. Draw whether the history row can go straight to a new deck from a pick.

## States to draw

At 390 and desktop:

- **Empty:** the player has never made a read, with the switch on.
- **One run.**
- **A handful** (4 to 7), mixed dates, one that found nothing, one with no words.
- **A long list** (20, and `Show 20 more` with more behind it).
- **Loading** the list.
- **The list failed to load:** the runs are kept, only the list failed; the retry.
- **A read in flight:** the player has a pending read and opens history.
- **Opening a run:** the run opening, then the past run itself, labeled as a past run and read-only.
- **An aged run:** some picks gone, some reasons not drawn, all of the picks gone.
- **A run that will not open** (its row is gone or failed to load) and its way back.
- **After a delete**, if Design draws one: the confirm, the row leaving, the empty state returning.
- **Focus:** a row, the open control, the retry, each delete control.
- **Switch off:** nothing drawn, nothing linked.

## Fixtures (staging, read-only)

Account A holds 4 answered runs of 8 to 10 picks (2026-10-12 and 13), which is enough for the handful, the aged run (a
commander built since) and the long-list frame by composition. Neither account holds a repeated ask, a run of 20, or a
run with a deleted deck, so the long list, the deleted-deck reason and the free-repeat cost frames are hand-built.
Pools and picks are real; Design may treat the exact names as illustrative if the arithmetic stays consistent.

## The About entry

**Likely an ordinary edit to the existing `help-me-choose` entry (`src/lib/copy/about.ts`, `id: 'help-me-choose'`,
`since: 9`), with no version bump.** This adds somewhere to find an answer a player already made and paid for; it is not
a new capability a reader has to discover first, and the entry already covers the surface it sits on. One key line is
enough ("Your past reads are kept, and reopening one is free.") plus a mention on the credits entry that reopening a past
read uses no credit. The entry is tied to a switch (`HELP_ME_CHOOSE_ENABLED`), so a bump would not announce it anyway.
Hugh decides whether a feature owes an entry and may overrule this.

## Copy

Every string goes through `/copy-review`: the list's heading and empty state, the row's lines, the read-only note, the
aged-run lines, the delete confirm if any, and the refusal and load-failed lines (in the shipped refusal shape,
`src/lib/copy/README.md`). Copy lives in `src/lib/copy/help-me-choose.ts` and the History tab's strings in
`src/lib/copy/tuning-hub.ts` are the nearest precedent. Working strings above are placeholders.

## Paths

- Run storage and the free repeat: `src/lib/intake/run-store.ts` (`startRead`, `storedRead`, `loadTheRead`,
  `settleTheRead`), `src/lib/intake/the-read.ts` (`TheReadResult`, `readFingerprint`, `reorder`),
  `src/lib/intake/the-read-run.ts`, `src/db/schema.ts` (`intakeReads`)
- The ask in the address: `src/lib/intake/params.ts` (`ChooseParams`, `serializeChooseParams`)
- The route and its doors: `src/app/decks/new/choose/page.tsx`, `src/app/decks/new/choose/actions.ts`,
  `src/components/intake/help-me-choose-door.tsx`, `src/components/commanders/rack/filter-rack.tsx`,
  `src/components/decks/create-picker.tsx`
- Results and reasons: `src/components/intake/choose-results.tsx`, `src/components/intake/choose-row.tsx`
  (`reasonDrawable`), `src/components/intake/read-panel.tsx`
- The pattern: `src/components/decks/tuning-history.tsx`, `src/lib/tuning/history-read.ts`, `src/lib/tuning/history.ts`,
  `src/lib/copy/tuning-hub.ts`
- Copy: `src/lib/copy/help-me-choose.ts`, `src/lib/copy/about.ts`
- The feature's earlier briefs: `docs/superpowers/design-briefs/2026-10-11-help-me-choose-rework.md`; handoff
  `design/design_handoff_the99_help_me_choose/`
- Switch: `helpMeChooseEnabled` in `src/lib/intake/flag.ts`
- Account purge: `src/lib/account/purge.ts`

## Deliverable

A handoff in `design/design_handoff_the99_hmc_history/`: the chosen list and row at 390 and desktop, the way into it from
both doors, every state above, the answer to each open question, and the `STATES` rows and design-table sections they
add. Include the About entry's edit on the per-entry artboard if Hugh rules it owes one.
