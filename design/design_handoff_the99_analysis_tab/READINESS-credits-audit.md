# Readiness audit: the credit-note addendum (canvas §7, `CREDITS-overview.md`)

**Verdict: 🟢 Green.** Audited 2026-09-23 against `origin/main` at `f93eea71` (#899) plus
Design's drop, committed as delivered on `design/credits-addendum`. All four asks are drawn at
1300 and 390, placed the way tuning places its *Suggest changes* note, with one shared credit
string, a rolling window, 12-hour time and no new mark or color. Nothing here goes back to
Design. Five findings are Medium and all five are engineering's. The two that matter most: the
drop's staleness rule restates an earlier draft of the brief (fingerprint or contract version),
which Hugh's ruling B and the amended brief both override, and the shipped allowance cannot yet name a next-credit time while credits remain. The copy goes to `/copy-review`, where one word
(*Synopses* against *overview*) is Hugh's.

## Scope, and what else the drop carries

- **In scope:** `CREDITS-overview.md`, canvas §7 (7a to 7h, `The 99 - Analysis Tab.dc.html:461-473`),
  the frame changes behind it (`Analysis Tab 1300.dc.html:102,127,142-158`,
  `Analysis Tab 390.dc.html:108,132,144-160`) and the fixtures (`analysis-fixtures.js:346-371`).
- **Also in the drop, not audited here:**
  - **The About r2 work.** `ABOUT-entry.md` is byte-identical to `origin/design/about-entry-touchup`
    (PR #897, open), and the canvas's §5 changes are that branch's too. `git diff
    origin/design/about-entry-touchup` on the canvas shows only §7 and §8. PR #897 audits it.
  - **§8, opening the tab** (8a, `The 99 - Analysis Tab.dc.html:475-482`; `HANDOFF.md` §Addendum,
    opening the tab; `STATES-analysis-tab.md` row 8a). A loader while the stored reading is fetched.
    Design's `READINESS.md` records Hugh's sign-off of §7 and §8. It is outside this audit's four
    items and needs its own owner; it is noted so it is not lost.
  - **One unannounced change to a signed-off state:** 2f (`rangeAnswered`) now sets
    `hasSubline: false` (`analysis-fixtures.js:284`), which drops the range subline from that
    frame. See finding 11.
- **No Home resume-row bracket chip is drawn.** Nothing in the drop mentions Home or the resume
  row. Hugh ruled yes on 2026-09-23, and it has not been briefed; it still needs its own prompt.
- **The engineering audit `READINESS-r1-audit.md` is kept.** The drop arrived with it deleted;
  that deletion was not carried.

## The four asks

| # | Ask | 1300 | 390 | Evidence | Result |
|---|---|---|---|---|---|
| 1 | First **Analyze** (empty state) states the credit | 7a | 7a | canvas `:465`; frames 1300 `:127`, 390 `:132`; fixture `S.idle` `:358`. 2c's *Try again* carries the same note (fixture `:359`), described, not redrawn | Drawn |
| 2 | Stale banner **Re-analyze** (2i) states the credit only when the list changed | 7c; 7d draws no note | 7c; 7d | canvas `:467-468`; frames 1300 `:102`, 390 `:108`; fixtures `:362`, `:367`. 2d's *Try again* carries it (`:364`), not redrawn | Drawn |
| 3 | Overview **Write one** / **Try again** (Round 0 states 2 and 4) state the credit | 7f, 7h | 7f, 7h | canvas `:470,472`; frames 1300 `:142-158`, 390 `:144-160`; fixtures `:369,371` | Drawn |
| 4 | Credits used up on each of the three | 7b, 7e, 7g | 7b, 7e, 7g | canvas `:466,469,471`; fixtures `:360,365,370`. Analyze and Re-analyze stay enabled (the bracket is free); Write one is disabled in tuning's disabled form (1300 `:146`, 390 `:148`). Try again used up takes 7g's form, described | Drawn |

**Constraints.** Placement matches tuning r3 E4 (mono 11 beside the button at 1300, mono 9.5
centered under it at 390; `CREDITS-overview.md:17-20`). One shared string with tuning
(`CREDITS-overview.md:40-44`), which is the rolling form tuning r3 set
(`design_handoff_the99_deck_tuning/README.md:108`). Rolling 24 hours, never *today*; 12-hour
`2:20 PM` (`analysis-fixtures.js:347`). No new mark or color: the only `--danger` is Round 0's
existing *not written* tag (frames 1300 `:151`, 390 `:153`). Copy is routed to `/copy-review`
(`CREDITS-overview.md:50-55`). All met.

**Design's three open items** (`CREDITS-overview.md:57-65`) are answered below: item 1 by
finding 7, item 2 by finding 8, and item 3 by Hugh's ruling D (finding 3).

## Findings

| # | Sev | What | Drop | `main` / plan | Resolves |
|---|---|---|---|---|---|
| 1 | Medium | **The rule restates the brief's superseded contract clause, which ruling B overrides.** The drop draws the note when the stored overview's fingerprint *or synopsis contract version* differs from the live list's. Hugh's ruling B (a contract bump is not an edit) keys reuse on the fingerprint alone, so after a contract bump an unchanged list must spend nothing and draw no note. Built literally, the drop's rule would charge a reverted deck's Re-analyze after every contract bump and replace prose the player has seen. The plan contradicts itself on the same point: decision 2 says "whatever contract it was written under", decision 9 says "under the current contract". The frames are right under either reading (7d draws the no-note case); only the sentence of the rule changes. | `CREDITS-overview.md:9-11` | plan `2026-09-23-synopsis.md:41` (decision 2), `:93` (decision 9), `:243` (ruling B); brief §6 Storage on `docs/deck-notices-brief` was amended at `9f990178` to key reuse "on the LIST fingerprint alone" (line 151), so the drop follows the draft before it | **eng**: build on the fingerprint alone, per ruling B; amend decision 9's wording in the plan |
| 2 | Medium | **The shipped allowance cannot name a next-credit time while credits remain.** The `left` form draws *4 of 5 left · next one at 2:20 PM*, the time the oldest counted spend leaves the window. `Allowance.reopensAt` is null while units remain and is set only once the limit is reached. The note needs the earliest counted expiry as its own field. The plan fences `src/lib/model/**` as consume-only, so this is an ask to the tuning lane (tuning's own `left` form has the same need). | `CREDITS-overview.md:41,47`; fixture `:348` | `src/lib/model/allowance-rule.ts:53-54` (null while units remain), `:78`; plan `:231-233` (the fence) | **eng** (tuning lane, beside tuning PR D item 5) |
| 3 | Medium | **Ruling D's composition is not drawn, and Design's open item 3 is already ruled.** After a used-up Re-analyze, the overview is older than the list and the banner is gone. Hugh's ruling D answers it: the old Overview stays whole, followed by the `Write one` line in state-2 chrome with its credit wording, or the reset line when spent, with no Design round. Audit ruling 7 says the same ("an exhausted allowance leaves the synopsis in its stale state with a reset line"). What is missing is the line's wording: 7f's *No overview has been written for this deck yet.* is false beside an overview that is on screen, so the stale case needs its own lead. | `CREDITS-overview.md:63-65`; 7f (canvas `:470`) | plan `:54-59` (decision 3), `:254-258` (ruling D); `READINESS-r1-audit.md:48-52` (ruling 7) | **eng** + `/copy-review` (ruling D: no Design round) |
| 4 | Medium | **The note's condition is not `stale`, and not `wouldSpend` alone.** Three cases have to be told apart: would write with credits left (the credit note), would write with none left (the used-up note), and would reuse (no note). `wouldSpend` is false in both of the last two, so it cannot choose between them alone. The plan's synopsis `stale` includes `dirty`, and a reading is not fresh while dirty (`stored.ts:154`), so after a revert to the analyzed list (ruling 5) the banner shows, the overview is current, and a note keyed on `stale` would draw the used-up line over a press that spends nothing. The condition is: the stored overview's fingerprint differs from `listFingerprint(deck)`, then the allowance picks the form. | 7d, 7e (canvas `:468-469`) | `src/lib/profile/stored.ts:154`; `READINESS-r1-audit.md:39-42` (ruling 5); plan `:48-49` (decision 3), `:91-94` (decision 9) | **eng** (PR 4: return the fingerprint test beside `allowance`) |
| 5 | Medium | **The modal's 6d banner is a press that writes, and carries no note.** 6d's *Re-analyze* "re-reads the bracket and rewrites the synopsis". The drop leaves `Synopsis Sheet.dc.html` untouched, so that press would spend with no note drawn, against the drop's own rule that a button never spends without its note. Ruling D gives 6d "that same line and control", so no drawing is owed. | `CREDITS-overview.md:12-13`; `SYNOPSIS-modal.md:62-65` | plan `:59`, `:256-258` | **eng** (PR 3/PR 4: 7c's note under 6d's control, both forms) |
| 6 | Low | **7d's stated route is unreachable, and the state is reachable another way.** The canvas reaches 7d by "the player pressed Write one after editing". `writeSynopsis` refuses unless the stored reading is fresh, so that press cannot write on an edited list. 7d is reached by a revert: list A with its overview, edit to B, a used-up Re-analyze reads B and keeps overview A, revert to A. The banner shows (dirty), and the overview is current, so the press spends nothing. | canvas `:468` | plan `:26-28` (decision 1); `stored.ts:154` | **eng** (the probe builds 7d by the revert route) |
| 7 | Low | **The shared module does not exist, and the shipped tuning string says *today*.** `deckTuningCopy.allowance.spent` is *You have used today's suggestions.*, read by the tuning refusal and the gate. The shared `credits` block replaces it on both surfaces, and tuning's frames still show 24-hour `14:20`. | `CREDITS-overview.md:38-47,59-60` | `src/lib/copy/deck-tuning.ts:99-106`; `src/app/decks/tuning-actions.ts:91`; `src/lib/tuning/gate.ts:32-33`; plan `:222-227` (PR 4 waits on tuning PR D item 5) | **eng** (tuning PR D item 5 creates it; synopsis PR 4 imports it) |
| 8 | Low | ***Synopses* against *overview* in the used-up string.** The tab says *overview*, and the shared string says *Synopses*. One word must win, and it changes both surfaces. | `CREDITS-overview.md:43,61-62` | `design_handoff_the99_deck_tuning/README.md:108` | **`/copy-review`**, Hugh's word |
| 9 | Low | **No 12-hour time formatter exists, and the time is the reader's clock.** Nothing in `src/` formats a clock time. The time has to be formatted on the client in the reader's own zone; a server render names UTC and mismatches on hydration. Tuning r3's audit asked for the same, formatted rather than written as a literal. | `CREDITS-overview.md:47` | `src/lib/copy/deck-tuning.ts:102-103` ("in the reader's own clock"); `design_handoff_the99_deck_tuning/READINESS-r3-audit.md:29-30` | **eng** |
| 10 | Low | **Undrawn neighbors of the drawn states.** (a) Ruling A's upstream-failure line (*We could not write the overview just now…* with *Try again*) is a writer and takes 7h's note. (b) A short deck: `blocked` disables Analyze and Re-analyze, and a refused press writes nothing, so no note draws. (c) While a press is in flight the note stays as drawn; the button disables in place. (d) The banner's DOM order differs by width (sentence, note, button at 1300; sentence, button, note at 390): one note node reordered at `md:`, never two mounted copies, tied to its button by `aria-describedby` so the cost is heard before the press. | 7h (canvas `:472`); frames 1300 `:102`, 390 `:108` | plan `:237-242` (ruling A); `analysis-panel.tsx:76`; `analysis-banner.tsx:13-16`; `analysis-empty.tsx:83`; `analysis-banner.tsx:38` | **eng** |
| 11 | Low | **2f loses its subline, unannounced.** `rangeAnswered` now sets `hasSubline: false`, which removes *Your cards permit Optimized or cEDH…* from a signed-off frame. §7's Overview states build on 2f (`S.overviewAbsent = { ...S.rangeAnswered }`), so it may be incidental. `STATES-analysis-tab.md` row 2f does not mention the subline either way. | `analysis-fixtures.js:284,369` | shipped string `src/lib/copy/declaration.ts:56` | **eng**: build 2f as shipped; ask Design in the PR if the removal was meant |

## What synopsis PR 4 must build

1. **The press writes only on success**, per the plan's PR 4 row: from `use-deck-profile.ts`, when
   `result.ok` and the reading answers the list it was asked about; a server refusal is a silent
   no-op.
2. **One condition, computed on the server:** `writes = storedOverview?.fingerprint !==
   listFingerprint(deck)` (fingerprint alone, ruling B; finding 1), returned by `fetchSynopsis`
   beside `allowance`. The note is `writes && left > 0` → the credit note; `writes && left === 0`
   → the used-up note; otherwise none (finding 4). Refetched on tab open, every press settle,
   every write settle and every list-key change (decision 9).
3. **The notes on every writing press**, from Design's placement: the empty state's Analyze and
   2c's Try again (7a, 7b), the banner's Re-analyze and 2d's Try again (7c, 7d, 7e), and the
   modal's 6d control (finding 5). Write one and Try again in the Overview are PR 3's, with the
   same strings (7f, 7g, 7h, and ruling A's upstream-failure line, finding 10a).
4. **The shared `credits` strings** from the tuning lane's module, with the lead sentences in
   `copy/synopsis.ts`; PR 3's interim reset line replaced (plan `:224-227`; finding 7).
5. **A next-credit time while credits remain** (finding 2), formatted 12-hour on the client
   (finding 9); `{n} of {total} left` alone at full credits.
6. **Ruling D's stale-overview line** with its own lead through `/copy-review` (finding 3), and no
   note on a blocked press (finding 10b).
7. **The probe:** reads each note BEFORE the press at 390 and 1300; builds 7d by the revert route
   and asserts no note and no ledger row (finding 6); asserts the used-up form leaves Analyze and
   Re-analyze enabled and Write one disabled; and runs the plan's two mutations (write on the
   `fresh: false` branch; drop the note's condition) plus a third: key the note on `stale`, which
   must fail the 7d case.
