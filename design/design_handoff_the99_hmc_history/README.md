# The 99 — Help me choose history (design handoff, R1)

`design/design_handoff_the99_hmc_history/` · 2026-10-15 · mirrors `design_handoff_the99_deck_tuning/` (its History tab is
the pattern). Voice: Kitchen Table. Theme drawn: Kaldheim.

**Status: R1, approved by Hugh (LGTM, 2026-10-15).**

**Source of truth:** `docs/superpowers/design-briefs/2026-10-14-hmc-history.md` on branch `brief/hmc-history`.
Aligned with `design_handoff_the99_help_me_choose/` (the results page, the carried-over answer) and
`design_handoff_the99_tuning_hub/` (History's row, paging, empty and failed states, the past-run note).

Canvas: `The 99 - HMC History (R1).dc.html` (the calls) plus `R1 - List-*`, `R1 - Run-*`, `R1 - Doors`, `R1 - About-Entry`.

---

## The surface in one paragraph

History lives on `/decks/new/choose`. From `md` up it is a 380px column to the right of the form (320 below 1100px),
sticky, scrolling inside itself past 560px. Below `md` the form's back line gains a `History` link that opens the same
list as a view of the route (`?view=history`, back link `‹ Help me choose`). It is one component, `ChooseHistory`,
placed twice. A row is a link to the results page for that run (`r` = its id, the rest from the stored ask), which draws
as today with three changes: the back link reads `‹ History`, a mono meta line dates it, and a dashed past-run note takes
the read panel's place.

## The locks

| Lock | How R1 holds it |
|---|---|
| Reopening is free | The row press and the opened page make no model call; the note says `Opening it again uses no credit.`. No credit pill appears anywhere in History. |
| Read-only | No edit in place. The opened page keeps the shipped `Change answers`, which opens the form filled: a changed answer is a new ask, as today. |
| Per account | The list reads the player's own rows; no friend, pod or admin surface draws one. |
| No "still free" badge (proposal 4) | Nothing in History says whether asking again costs. Re-asking goes through the form's own press and its own cost line. |

## The open questions, in the brief's order

1. **List or grid: a list.** A run's identity is a sentence of the player's own words; a grid of art would lead with the
   pictures and cut the words to one line. The picks still show, as three small thumbs (22×30 at 390, 18×25 in the column)
   in the run's order. The deck History is a list for the same reason.
2. **What a row shows: the words, the first three picks, the count, the date.**
   - Words: 13.5px (13 in the column) `--fg`, clamped to two lines with an ellipsis. The whole ask is in the opened run's
     `You wrote` block. Tagged cards read as their names.
   - No words: a `YOUR ANSWERS` mono lead, then a line built from the stored answers in the form's order (colors, themes,
     sets, the 99, card, budget, bracket), joined by ` · ` (`Golgari · Graveyard · built around Meren · under $60`).
   - Picks: three thumbs and `9 picks` (mono, `--fg-muted`).
   - Found nothing: no thumbs; `found nothing · no credit used`.
   - Date: `Oct 13 · 9:40 PM`, the deck History's `historyDate`, right-aligned; month headings (`historyMonth`) group rows.
   - Not drawn: the cost. Every answered run cost one credit and every nothing-found run cost none, so a cost tag would
     repeat the outcome on every line.
   - Accessible name: `<words or answers line>. <Month day>, <N picks | found nothing, no credit used>.`
3. **Reopening versus re-asking: one press reopens; no Ask again control.** The opened run is the results page, whose
   `Change answers` already restores the question and answers into the form. Its press then states its own cost
   (`1 credit` pill, the filled caption), and a repeat that turns out free says `No credit used · you asked this already`
   in the done line, as today. Nothing new has to guess the fingerprint.
4. **Deleting a run: none.** Runs are the record, as on the deck History. A delete would make the same ask cost again and
   return nothing. The account purge already removes every run. If privacy of stored words becomes a concern, a per-row
   delete with a confirm is an R2 add (G8).
5. **A run that has aged: live, with a count and a quiet group. No snapshot.**
   - The note adds `7 of its 9 picks are still open to you.` only when some went, or `None of its 9 picks are open to you
     now.` when all did.
   - A pick that went leaves the order and joins one group after the picks, `NOT OPEN TO YOU NOW · N`: a 24×34 thumb at
     55%, the name (still opens the card), and why: `you built it since · <deck name>` with `Open deck`, or `no longer
     among the commanders we rank` for every other cause. Never collapsed.
   - A reason that named a deleted deck draws `Its line named a deck you’ve since deleted.` in `--fg-faint`, so the row is
     never a silent gap, and the sub drops `each with a line on why`.
   - The best-fit cards on desktop take the next open picks, so three stay three.
   - No snapshot: names, art and identity come from the catalog by the stored oracle id; nothing the record needs is lost.
6. **Where it lives: on the route.** Desktop column beside the form; phone view one press from the form's header (the
   `History` link sits on the back line, so the form moves by nothing). The New deck door gains `Your past runs ›`
   when the player has a run to list (its own 44px line on a phone, the end of the sentence on desktop). **Discover does
   not link to it**: it carries colors into a new ask, and History is not what a player browsing commanders wants.
   - A read in flight: listed on top, accent border, `reading` tag, `now`. Its press opens the live results page with the
     waiting panel; it settles in place (the list re-reads every 3s while one is reading). A failed or stopped read
     leaves the list.
   - Switch off: no column, no view, no header link, no door link; the route is not found.
7. **Nothing-found runs: listed.** So a player can see they asked it already. Opening one shows today's `Nothing fits
   what you wrote` panel with the run's stored `pool`, under the note `It found nothing, so no credit was used.`
8. **Ordering and filtering: newest first, no filter or search.** A handful of runs needs neither. Month headings, keyset
   pages of 20, `Show 20 more` (the shipped stagger), and a failed page keeps its rows with a retry line.
9. **The carried-over answer: through the run.** A row has one press. The opened run's picks hand off to a new deck exactly
   as today, answers carried. A pick straight from a row would put a second press inside a row and skip the reasons.

## The opened run

- Header: `‹ History` (back to the form with History open; focus returns to the row), the shipped title `Commanders for you`,
  then `Oct 13 · 9:40 PM · a past run` (mono, `--fg-faint`).
- The note (dashed, `--border-dashed`, `--fg-faint`, the deck History's past note): `A past run, read-only. Opening it again
  uses no credit.` (ruled 2026-10-14: the spent-credit clause is dropped everywhere, one note for every listed run) plus the aged count when it applies.
- Focus moves to the title on open; its accessible name adds `, a past run from October 13, read-only`.
- Opening: header and note draw at once from the row; picks breathe on the shipped results skeleton.
- Won't open (row gone, another account's id, read failed, an old pasted link): the failure mark, `This run didn’t load.
  Try again from History.` and `Back to History`.
- Everything else (You wrote, the chips, Change answers, Start over, the order line, the rows, The rest of your results)
  is the shipped page, unchanged.

## The About entry

Two ordinary edits, no `ABOUT_VERSION` bump (brief §The About entry):
- `help-me-choose`: a sentence at the end of the caption's third paragraph, `Every run that reads your words is kept under
  History, and opening one again is free.` The entry has four keys already, the most an entry carries.
- `credits`: a caption line of its own, `Opening a past “Help me choose” run from History is free.`, behind
  `HELP_ME_CHOOSE_ENABLED` via `captionLineSwitches`.
Both re-pin the content hash. Hugh rules whether the feature owes more.

---

## Gap report

| # | Gap |
|---|---|
| G1 | **Needs the stored ask (proposal 1).** A run with a result and no ask cannot be redrawn (the results page runs the search from the answers). R1 hides those rows; that is all 5 answered runs on staging today, so Account A's History starts empty at launch. Engineering may decide otherwise; R1 draws no generic row. |
| G2 | **The pending row departs from proposal 3**, which lists only `ok` and `nothing_valid`. The list read must also return the player's one pending row. Reason: a player who closed the tab mid-read looks in History for it. |
| G3 | **The no-words row.** A stored read needs words today; the row exists only if a read can be stored with an empty `w` (a box holding only card tags). Drawn as the brief asks; engineering confirms whether it occurs. |
| G4 | **Why a pick went.** `you built it since` needs the player's decks by commander (the reader already has them for `isCandidate`); every other cause reads `no longer among the commanders we rank`. The deck link is the newest deck led by that commander. |
| G5 | `It used 1 credit on <date>` was false for an `ok` run that was refunded, and no call status is read for a sentence. Ruled 2026-10-14: the clause is dropped. |
| G6 | The nothing-found panel's number is the row's stored `pool`, not today's count. |
| G7 | The column draws on the form only; the results page keeps no column, as today. |
| G8 | No delete. If stored words become a privacy question, a per-row delete with a confirm (`the same ask would cost a credit again`) is R2. |
| G9 | The door's link needs a `limit 1` exists read on `/decks/new`, behind the switch. |
| G10 | New strings are placeholders for `/copy-review` (`hmc-history · copy strings.ts`). |
