# READINESS audit: Find a deck for it, with a read (R2)

Audited 2026-10-11 against `docs/superpowers/design-briefs/2026-10-11-find-a-deck-read.md` (main,
#1486 and #1489), the code at `origin/main`, the engine lane's work in progress (`.worktrees/fits-read`,
`src/lib/swaps/fits-read.ts` and `fits-read-load.ts`, uncommitted, read only), and staging read-only
(Neon `misty-rain-01681654`, branch `br-polished-pond-a6e63y0b`, Hugh's account). Build from
`The 99 - Find a Deck Read (R2).dc.html` with `Find a Deck View.dc.html`.

## Verdict: GREEN

Both of Hugh's rulings, the eight orchestrator defaults and the ten engineering locks are honored.
Every item Design owns (1 to 12) and every open question (1 to 6, and 8; 7 was closed) is answered,
and the Q8 rows are drawn (P3f, P3g). Every required state is drawn at 900 and 390, or is a no-frame
row that reuses a drawn one. The findings below are engineering corrections, a STATES slip fixed in
this PR, and two states the engine can produce that Design did not draw; each resolves with states
already drawn, so nothing goes back to Design. Two product questions carry a default and do not
block the build.

## What was checked

- **Ruling 1** (a model call, 3 to 5 decks, one sentence each, a cut): P3, P4, P5, P6, P7, P8, with
  `FITS_READ_TOP = 5` in the engine and a cut line on every row.
- **Ruling 2** (the picker as a view inside card details, both widths, `← {card}` back, stand-ins
  stacked): D1 and every P frame draw the view in the dialog's right pane at 900 (the 322 art column
  stays) and on the sheet from 0 at 390. R2 moved `← {card}` into the ✕'s slot (stacked-sheets call 2)
  with no ✕ in the view. Stand-ins and a card opened from the view still stack (README call 1, STATES
  D4, D5).
- **Defaults 1 to 8.** The press is additive and the free list stays today's (P1, fold in P3); the
  read adds the how in the deck's own cards and a cut (lock 10); deck names are drawn by the app, never
  the model; one credit with the refunds (P4, P6, P7); the switch, with the picker exactly today's when
  off (STATES header, Must-not).
- **Locks 1 to 10.** No digit, percentage or score word in the sentence (Must-not; the counts are app
  chrome, README "Other decisions" 1); cites are card marks only, and a quote is drawn only from a
  stored plan (Gishath, P3f); one run in flight (P2a); stored reads keyed on the whole candidate set
  (P9, P10, P10a, P10b); fewer than five and a single candidate still run (P5, P1a); no press for
  `allHold` / `noneByColors` (P1b); every row cites a card (lock 10).
- **Frames at 900 and 390** (the canvas loop renders each section at both, `The 99 - Find a Deck
  Read (R2).dc.html:50-64`): press (P1), loading (P2), 3 to 5 results (P3, three rows), fewer than asked
  with the credit back (P4), complete but short (P5), no fit (P6), failure (P7), no credit left (P8),
  a stored read reopened (P9), a stored read with a changed deck (P10), no-Overview and older-Overview
  rows (P3f), a new Overview since the read (P3g), a kept no fit (P6b, P6c), and the swap from details
  to the view (D1 to P1; the motion and the way back are STATES D1 to D3, no frame, both ends drawn).
  Scrolled 900 frames for P3, P3f, P3g, P9, P10.
- **Design table against the view component** (spot-checked, `Find a Deck View.dc.html:300-390`): back
  pill h44 / h36, max-w 200 / 260, radius 999, `--elevated`, 12.5/600; view head padding 12 16 14 /
  22 22 16 30; title 19 / 22 at 1.2; body padding 16 16 28 / 18 30 30, gap 16; press h44 / h38,
  radius 8, 13/600, segment rule `--bg` 35%, 0.5 when spent; row radius 9, padding 12 / 12 14, gap 9,
  changed at 0.72; actions h44 / h32, radius 8 / 7, 13 / 12.5, a 1:1 grid on the phone; fold min-h
  44 / 38 with the bottom rule only when shut; no-fit box at 0.72 under P6c. All match, apart from F3.
- **Copy.** Select/unselect throughout (`Swapped in`, `Added`, `aria-pressed`), no tick anywhere
  (Must-not). Credits reuse `creditsCopy.standing` and `first` in their own format; the read's
  `again` replaces `creditsCopy.again`, which names suggestions (`src/lib/copy/credits.ts:79`). US
  English apart from F9. No em dash in a string.
- **About entry.** `find-a-deck-read`, chapter 03 after `fits-your-decks` (`src/lib/copy/about.ts:826`),
  `switch: 'FIND_A_DECK_READ_ENABLED'`, a new `AboutSwitch` member, no bump, `since: 14` =
  `ABOUT_VERSION` (`about.ts:61`). Drawn at 760 and 390 on the §G template.

## Coverage re-measured (brief Finding 1, Q8)

Staging, Hugh's account, 2026-10-11 late: the newest passing Overview per deck.

| Overview | Brief (2026-10-11) | Now |
| --- | --- | --- |
| Contract 12 (v2) | 4 of 21 | **20 of 21** |
| Older (contract 7) | 8 | **1: HD - Omnath** |
| None | 9 | **0** |

Omnath has an older Overview, not none: "every deck but Omnath" holds for v2, and no deck on Hugh's
account is without one. Both rows still exist as states and must be built: a friend's account, a new
or imported deck, and any deck before its first Overview read from commander and themes. On Hugh's
decks today the older row is one deck (an Ajani candidate) and the none row is never seen, so P3g
(a new Overview since the read) is the path Omnath will take next, and the fixtures on the canvas
(Prismari Artistry and Kratos as `none`) no longer match staging; they are illustrative (G1).

## Findings

**F1 · STATES P1 still drew a ✕ in the view head. Fixed in this PR.** R2 retired it ("No ✕ in the
view", README R2 1; table rows `Back pill` and `✕ (R2)`; Must-not "a ✕ and a back pill together").
The canvas has no ✕ in the view (`closeStyle` is defined and never used, `Find a Deck View.dc.html`).
Frame mismatch: the table wins. The row now reads title left, `← {card}` in the ✕'s slot.

**F2 · The read's own actions make it stale.** Swap in and Add only edit that deck, which moves its
input hash (lock 6), and the deck then holds the card, so it leaves the candidate set (`loadFits`'s
`open`, `src/lib/swaps/fits.ts:188`). Read literally, reopening after any swap shows `staleSet` and a
Read again for a change the reader made through the read itself; P9 (current) would be reachable only
by a reader who never acted. The same holds for STATES P2c (an Add from the free list mid-run).
**Engineering call:** a candidate that now holds the card because of this read's Swap in or Add only,
or the free list's Add, is RESOLVED, not changed. The staleness test excludes it from both the set
comparison and the hash comparison, and its row reopens in the pressed state it was left in (P3a or
P3h, drawn), with its undo live while the take's `swapId` (`TakeResult`, `src/lib/swaps/take.ts:30`)
or the add is still undoable. A deck that left by any other edit is P10b.

**F3 · The canvas caps the free list at six rows with "{n} more below, in the same order".** The
table says the free list is today's `FitsRows`, unchanged, and the copy file says the cap is not built.
Frame mismatch: the table wins. The fold opens to every row, as the shipped list does.

**F4 · A row with no cut is not drawn.** The engine's schema allows `cut: null` ("only if no card can
be cut", `fits-read.ts:98`, rule at `:111`). **Engineering call:** the row omits the cut line and Swap
in, and carries `Add only` alone with its note (P3h's line). No new visual.

**F5 · Every deck the model named fails the checks.** Lock 10 refunds it, but it is not a no fit: the
model said these decks fit, and the app could not stand behind any of them. Drawn as P6 and kept (R2
3), it would hide the press until a deck changes over a verdict the model never gave. **Engineering
call:** it draws P7 (failure, Try again, credit back) and is not stored. Hugh question 1.

**F6 · "Changed since" and "new overview" need to be told apart.** P3g tags a row `new overview`
where P10 tags `changed since`, but lock 6's per-candidate hash is over the whole rendered input and
cannot say which part moved. **Engineering call:** the stored result keeps, per candidate, the
Overview's id (or a plan hash) beside the input hash; a moved plan with an unchanged list reads
`new overview`, anything else `changed since`. This also answers G5 (which decks changed): the stored
per-candidate ids name them.

**F7 · The credits entry must name the read.** R2 4 makes About `credits` the one place the spenders
are listed, and its caption lists three (`about.ts:1169`). **Engineering call:** add a bullet for the
read, gated on `FIND_A_DECK_READ_ENABLED` through `captionLineSwitches`, as Suggested changes' and
Help me choose's bullets are. An ordinary edit, no bump; wording through /copy-review.

**F8 · The credits link change is app-wide, and ships on its own.** Hugh's R2 decision rewrites
`creditsCopy.spent` and `pausedReason` and drops their `deeperLooks` / `tuning` flags across nine
callers (`cuts-actions.ts`, `tuning-actions.ts`, `ch01-figures.tsx`, `tuning-panel.tsx`,
`synopsis-note.ts`, `synopsis-overview.tsx`, `cuts-panel.tsx`, `intake/standing.ts`,
`copy/deck-tuning.ts`). **Engineering call:** its own PR, not behind this feature's switch, through
/copy-review; the read's PR then uses the new `spent`. The link targets `/about#credits` (entries carry
their own anchors, `src/components/about/about-page.tsx:98`). The separator moves from `.` to ` · `
in the drawn line (`0 of 3 left · reset at 2:20 AM · What uses credits?`). The canvas's `of 3` is a
fixture: the friend allowance is five (`MODEL_FRIEND_DAILY_ALLOWANCE`, `allowance-rule.ts:25`).

**F9 · US English: "any more".** `staleOne`, `staleMany` and `staleSet` say "may not hold any more";
US English writes "anymore". Owed to /copy-review with the rest of the placeholders.

**F10 · The thin note over-claims its reason.** `thinSub` says the other decks "didn't check out
against their lists", but a deck also drops for a false quote, a figure or score word, its length, or
a job its labels lack (`FitsDropReason`, `fits-read.ts:207`). /copy-review: say they didn't check out,
without naming against what.

**F11 · Sentence length.** The engine caps a sentence at 240 characters with names drawn in
(`FITS_READ_SENTENCE_MAX_CHARS`). At 13px in the 438px desktop measure that is about four lines,
Design's stated ceiling (G2). No change; the eval should report the length distribution.

**F12 · The engine returns what the rows draw.** `PlanSource = "v2" | "older" | "none"` per deck
(`fits-read.ts:62`) feeds the plan-source segment and the source note; `FitsSentencePart` is text, a
card key or a quote, which is exactly the sentence's three kinds of span; cites are closed label kinds
and are never drawn. Nothing in the design needs a score, a rank number or a percentage. The row
order is the model's ("the deck it helps most first", `fits-read.ts:113`), drawn without a number, as
README "Other decisions" 4 says.

**F13 · The README and READINESS headers still say R1** and "Open questions 1–6"; the addendum
answers item 12 and Q8. Record only.

## Tests and the stacked-sheets rule

- `src/components/cards/fits-picker.test.tsx:286` ("stacks the picker over the card, which stays
  mounted and covered") pins the stacking. With the switch on the card is not `inert` and the picker
  is not a second modal, so the pin holds only with the switch OFF. Keep it there, and add the
  in-dialog pins: the view replaces the pane in the same dialog node, `← {card}` / Escape / hardware
  Back return one layer with focus on the door, Prev/Next and the footer are hidden in the view, and
  a card opened from the view still stacks (`inert` on the dialog).
- `scripts/probe-fits-stack.mjs` asserts a card opened from the picker stacks over it. Still true with
  the switch on (the card stacks over the dialog holding the view); its `closest("[inert]")` reading of
  the card under the picker inverts, so the probe takes the switch state as a parameter.
- **Stacked sheets.** Call 7 (`design/design_handoff_the99_stacked_sheets/README.md:36`) is reversed
  for Find a deck only, as ruling 2 says; stand-ins keep it. Call 8 (nothing in a stacked card opens a
  further layer) is unaffected: the door lives in the base card, and a card opened from the view
  stacks once. Call 6 says a card layer never moves sideways, because sideways is paging; the view's
  16px horizontal slide is a pane swap inside one layer with Prev/Next hidden, not a card layer, so it
  does not collide. Escape and hardware Back go through the dialog's existing one-layer handling
  (`src/lib/a11y/dialog.ts`), adding the view as a rung above details.

## Engineering calls resolved

1. F2: a deck that took the card through the read or the free list is resolved, not stale; its row
   reopens pressed.
2. F4: a row with no cut draws Add only alone.
3. F5: every named deck dropped draws as a failure and is not stored.
4. F6: store the plan's id or hash per candidate beside the input hash.
5. F7: a switch-gated credits bullet for the read.
6. F8: the credits link is its own PR, app-wide, ahead of the read.
7. The About switch reads `findADeckReadEnabled(env) && swapToolsEnabled(env)`: the picker lives
   behind the swap tools, as `fits-your-decks` does (`about.ts:832`).
8. G3: Swap in uses `takeStandInAction` and its undo `undoSwapAction(swapId)` (`actions.ts:29`, `:38`),
   both shipped. G10: Add only's undo needs a remove-from-draft for the card the view added; that is
   new.

## Questions for Hugh

1. **When the read names decks but none of its reasons hold up**, should the picker say "the read
   didn't come back, try again" (credit back, you can press again at once), or "none of these decks is
   a real fit" and keep that until a deck changes? Default: the first, since the app couldn't stand
   behind any answer, not that the answer was "no fit".
2. **After you swap a card in from the read**, and open the card again later, should the read still be
   there with that deck shown as swapped in? Default: yes, free, with the swap still undoable.
