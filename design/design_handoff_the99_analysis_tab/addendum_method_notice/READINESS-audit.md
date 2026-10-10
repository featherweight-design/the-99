# Readiness audit: the method notice and the free rewrite (`addendum_method_notice/`)

**Verdict: 🟢 Green.** I audited this on 2026-10-10 against `origin/main` at `64b80fcf8`. The drop
implements `docs/superpowers/plans/2026-10-10-overview-accuracy.md` §7.4 (PR 5) with Hugh's
override: it is a separate notice and does not reuse the stale state. It draws every state the
brief asked for at both widths and keeps every locked point. Design's one open engineering call
(1f, one press) can be built as drawn. Each gap below is engineering's and is resolved here as a
build rule, so nothing goes back to Design. Eight new strings go to `/copy-review`. Hugh still
approves this audit before it merges.

## Scope

- **In scope:** `ADDENDUM-README.md`, `Method Notice Addendum.dc.html` (1a to 1f, both widths), the
  `methodNotice` block in the two child canvases (`Analysis Tab 1300.dc.html:140`,
  `Analysis Tab 390.dc.html:142`) and the fixtures (`analysis-fixtures.js:397-423, 431`).
- **What changed in existing files.** The child canvases and the fixtures are copies of
  `../addendum_overview_loading/`'s, and each differs from those copies only by additions:
  - the `methodNotice` block, one `<sc-if>` per canvas;
  - six new options in each canvas's `state` enum;
  - the `M` copy block, the six `S.m*` states and one line of mapped props in the fixtures.

  Nothing that was already there was edited. `support.js` and all 15 files in `assets/` are
  byte-identical to `../addendum_overview_loading/` and to the parent handoff.
- **Outside the new folder: nothing.** The export deleted the rest of the tracked
  `analysis_tab/` folder in the main checkout. This branch was cut from `origin/main` and adds the
  subfolder only, byte-identical to the backup of the drop.
- **About:** no new entry, and no `ABOUT_VERSION` bump. The plan (§8) makes the free rewrite an
  ordinary edit to the credits entry's "Writing a deck's Overview" line. That edit is owed in PR 5.

## Locked points, against the drawing

| Locked (brief) | Drawn | Holds |
|---|---|---|
| The press rewrites the Overview only | The notice sits inside the Overview section. The note in 1a says the bracket and stats stay. The README says the bracket box, the climb, the findings and `analyzed …` never change from 1a to 1e | Yes |
| Free once per deck per method version, at most 2 attempts | 1d is "1 free try left". In 1e the press falls back to the paid **Write a new overview** with the shipped `Uses a credit. {standing}.` (`creditsCopy.first`) | Yes |
| Owner press only, never automatic | Every write starts from a press. Nothing writes on load | Yes. See build rule 9 for who sees the notice |
| A distinct banner, not the stale state | Dashed `--border-dashed` on `--surface-sunken`, an outlined button and its own line. The stale banner is solid `--border-strong` on `--surface-rail` with a filled button | Yes. All seven tokens are declared in `globals.css` |
| Says free even at 0 credits or with the allowance paused | 1a's caption reads "the same at 0 credits or paused". The note never carries the standing | Yes, with build rule 2 |
| No new tag and no Notices-sheet entry | None drawn. The README states the rule again | Yes |

## Requested states, both widths

All six appear on the canvas at 1300 and at 390. Each one is a `dc-import` of the matching child
canvas.

| | State | 1300 | 390 |
|---|---|---|---|
| 1a | eligible | ✓ | ✓ |
| 1b | writing | ✓ | ✓ |
| 1c | done (notice gone) | ✓ | ✓ |
| 1d | free run failed, 1 left | ✓ | ✓ |
| 1e | both used, paid press | ✓ | ✓ |
| 1f | with the stale banner | ✓ | ✓ |

## Design's open calls, as answered

1. **Placement:** inside the Overview section, under its label row and above the held paragraph.
   It is not a tab-level banner, so where it sits tells the reader what the press touches.
2. **Precedence against the stale banner (1f):** the stale banner keeps the top of the tab. The
   notice keeps its line, loses its button, and its note points to Re-analyze. Re-analyze's credit
   note becomes the free line (`pressNote.free`). One press writes the overview once.
3. **Dismissible:** no. The notice describes the text below it, like ruling D's `olderThanList`.
   It goes when a successful write makes the shown overview contract 8.
4. **Wording:** Hugh's starting line was reworded, because "analyze" and "Re-analyze" already mean
   the bracket on this tab and §11.3 rules that this press does not touch the bracket. The new
   line is *We've changed how we write overviews. This one was written the old way.* It goes to
   copy review below.
5. **The attempt cap shows only after a failure** (1d), so the free rewrite never sounds as if it
   might not work.

## Verified against the code

- **A contract change never stales an overview** (ruling B). `SynopsisState.stale` covers edits
  and moved data only (`read.ts:26-31`), and a write over the same list returns `reused` whatever
  the contract (`generate.ts:486-491`). So the notice needs its own field. It cannot be a reason
  added to `stale`, and Hugh's override agrees.
- **The shown row carries its contract.** `readShownSynopsis` already selects
  `contractVersion` (`generate.ts:217`). Contract 8 is `SYNOPSIS_CONTRACT_VERSION_V2`
  (`limits.ts:25`) and is written only while `OVERVIEW_V2_ENABLED` is on.
- **`origin = 'system'` is already allowed** (`model_calls_origin_check`, `schema.ts:1908`).
  `reserveModelCall` hardcodes `origin: "player"` (`allowance.ts:191`), as the plan says.
- **Three places refuse a write when the allowance is paused, the owner's share is used up, or
  the credits are used up.** `wouldSpend` (`read.ts:122-124`) picks the overview's note. `spent`
  (`synopsis-overview.tsx:127`) disables the press (`disabled={!canWrite || spent}`, `:148`).
  `pressNote` (`synopsis-note.ts:40-45`) returns `writes: false`, so Re-analyze never chains a write
  (`builder-shell.tsx:484`). The plan names only the first. All three need the bypass, which is
  build rule 2.
- **Re-analyze writes its overview through the same action as Write one.** The banner's press reads
  the profile, and when it lands `builder-shell.tsx:490-499` calls `synopsis.write`, which is
  `writeSynopsis` → `writeSynopsisFor`. That is the same server path the notice's button and ruling
  D's button use. A section retry goes through `retrySynopsisFor`, and both reach the shared
  `run()` (`generate.ts:456`). **So Design's preferred 1f (one press) can be split cleanly, and the
  fallback is not needed** (build rules 1 and 2).
- **Shipped strings Design reuses exist:** `synopsisCopy.writeNew`, `.tryAgain`, `.ready`, `.failed`,
  `.olderThanList`, `.pressNote.*` (`src/lib/copy/synopsis.ts`) and `creditsCopy.first`
  (`credits.ts:70`).

## Build rules (engineering gaps, resolved)

1. **The server decides what a write costs from eligibility, not from which button was pressed.**
   The check lives in `run()` (`generate.ts:456`), which both `writeSynopsisFor` and
   `retrySynopsisFor` reach. When the deck is eligible, `run()` reserves with `origin = 'system'`
   and skips the player allowance. It also bypasses `reused` at both sites: `generate.ts:~486`, and
   the re-decision under the lock at `~337-386`. The notice's button, ruling D's button,
   Re-analyze's chained write and a section retry therefore all take the free path while the deck
   is eligible. A section retry on an eligible contract-7 overview is already rewritten whole at
   contract 8 (`generate.ts:476-479`), so that write is the free one too and is never charged.
   Putting the check in `writeSynopsisFor` alone would let the retry charge a credit and end
   eligibility.
2. **The read exposes `methodNotice: null | { attemptsLeft: 2 | 1 | 0 }`, and the client's refusal
   points all read it.** The server cannot reach a write the client never sends, so while
   `attemptsLeft > 0`:
   - `pressNote` (`synopsis-note.ts`) returns `writes: true` with `pressNote.free` in place of its
     paused, owner-share and used-up branches, so Re-analyze chains the free write in 1f
     (`builder-shell.tsx:484`).
   - `spent` (`synopsis-overview.tsx:127`) does not disable the notice's press or 1d's **Try
     again**.
   - `wouldSpend` stays unchanged, because it means a credit would be spent, and no credit is.

   The illegal-card refusal (`synopsis-note.ts:30`) still wins, under build rule 8. In 1e, with no
   attempts left, every point reverts to the shipped Write one rules, so the paused and used-up
   notes stand in for the button where they apply. That is the README's "the normal rules
   apply".
3. **Eligibility.** All of these must hold:
   - `OVERVIEW_V2_ENABLED` is on.
   - The deck's shown overview exists and has `contractVersion < 8`. The shown overview is the
     current list's if there is one, and otherwise the newest.
   - No contract-8 row written by a `system` call has SUCCEEDED, meaning the row is `done` with an
     `ok` verdict, which is `readShownSynopsis`'s own predicate (`generate.ts:226-227`). A failed
     free run also leaves a contract-8 row and settles its call `refunded` (`generate.ts:449-454`).
     So "has a row" or "the call settled" would end eligibility at the first failure, and 1d could
     never be reached.
   - Fewer than 2 `system` calls exist for the deck at contract 8, whatever they settled as. This
     is the separate count for the cap (rule 4).

   This is the plan's rule with one change: the shown row need not be the current list's. Without
   that change, the 1f deck, whose list has moved since its overview, would never be eligible. A
   deck with no overview shows no notice, because nothing was written the old way.
4. **What counts as an attempt.** Every `system` call counts, whatever its outcome: a failure
   (busy, timeout, malformed, interrupted, rejected) or a refusal by the claim checks. This is the
   plan's join, and it keeps the cost bounded. After one counted attempt the notice is 1d. After
   two it is 1e.
5. **The notice carries a free run's failure, so the slot shows no failure of its own.** In 1d and
   1e the fixture draws the held overview with no `lastFailed`, `lastRejected` or `lastRefused`
   row (`S.mFailedOne` and `S.mFailedSpent` spread the plain written state). When the newest run is
   a `system` call, the slot leaves out its ruling A failure row, its rejection line and its
   refusal line. A refusal reads as line B. A rejection (`upstream_rejected`) still shows 1d's
   **Try again** when an attempt is left, because the one attempt left is the only bound.
6. **1f's combined form applies only when Re-analyze would write the overview** (`pressWrites`).
   The banner can also show over an overview that is current for the live list (the shipped
   `S.staleOverviewCurrent`, an empty banner note). There, Re-analyze writes nothing, so "Re-analyze
   above writes it the new way" would be false. In that case the notice keeps its own button (1a)
   and the banner keeps its shipped note.
7. **When the overview's own stale row is also showing,** the notice's button is the one press.
   That row is ruling D's `olderThanList` with **Write a new overview**, drawn when the reading is
   fresh and the overview is not, for example when the credits ran out at Re-analyze. Both buttons
   would run the same `writeSynopsis` (rule 1), so the row keeps its caption and drops its button.
   That avoids two identical buttons with different notes, and it needs no new copy.
8. **The notice is withheld while the deck holds a card a legality notice stands for.** The write
   refuses as `illegal` before anything else (`generate.ts:465`), and the withheld form owns the
   slot. The notice is also gone while a run is pending, which is 1b.
9. **Only in the owner's tab.** The notice comes from `readSynopsisState`, which already returns
   null for anyone but the owner. It never draws on a version's copied overview
   (`synopsis-version.tsx`, which is never stale), on the version diff, or in the full-overview
   modal. The modal is reached from the tab, and the notice describes the tab's paragraph.
10. **Focus and announcement.** On a press the notice is removed, and focus moves to the label row's
    status (README). 1c announces the shipped *Overview ready.* once. In 1d and 1e, line B or C is
    `role="alert"`. The mark is `aria-hidden` and never changes color.
11. **The cap is enforced on the server, and the read never decides it alone.** Under the
    reservation lock, a third `system` reservation for the same deck and contract is refused and
    falls through to the player path. The plan's two tests are owed: a `system` call never reaches
    the player allowance, and a call over the cap is refused.

## Gaps returning to Design

None.

## Copy (owed to `/copy-review`)

New (`synopsisCopy.method`):

- A: `We've changed how we write overviews. This one was written the old way.`
- `Free, no credit used. Only the overview is rewritten; your bracket and stats stay as they are.`
- `writing a new one with the new method` (label row, mono)
- B: `We couldn't write the new overview. Nothing about your deck changed.`
- `1 free try left. No credit used.`
- C: `We couldn't write the new overview with the free tries. You can still write one with a credit.`
  Under build rule 2, line C also shows while the allowance is paused or the owner's share is used
  up. Then "you can still write one with a credit" is not true this month, so review needs to word
  it for that case too.
- `Re-analyze above writes it the new way, free.`
- `pressNote.free`: `Also writes the overview, free this once because we changed how overviews are written.`

The fixture types these with straight apostrophes in the README and `’` in `analysis-fixtures.js`.
Ship the typographic `’`, as the rest of `synopsis.ts` does.

Reused: `synopsisCopy.writeNew`, `.tryAgain`, `.ready`, `creditsCopy.first` and the
`pressNote` notes (1e), and the stale banner's `bannerLine` and **Re-analyze**.
