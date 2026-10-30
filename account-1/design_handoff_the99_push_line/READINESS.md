# Readiness — the card note and the verdict (Round 4 of 5, R1)

**Self-assessment: 🟡 Yellow.** The four deliverables are drawn and the copy is production-final,
but **two calls depend on things outside this round** — the note's best clause needs Round 3's
declaration to ship, and one rejected option (auto-analyse) turns on a performance number nobody
has measured. Neither is a redraw; both are named below.

## What the amendment changed, and what it did not

**Withdrawn:** §4.1's premise. A per-add sentence about the deck's standing is no longer
writable — it would either recompute what the ruling says we do not recompute, or quote a reading
from four edits ago as though it were current.

**Unaffected:** §5 in full; §4.2–§4.4 and their R2 answers, which live on the Analysis tab where a
determined verdict lives. **§4.5 re-read as a question about the card note**: it does not persist,
and does not need to.

**Transferred rather than discarded:** `bracketDelta`'s five sentences are now the *verdict's*
vocabulary. The corrections in the superseded canvas — the binding bracket, the two `ruleless` and
`unquantified` forms, the three `inert` clauses, the `inert`-over-`ruleless` precedence — remain
the right copy wherever a determined verdict explains itself. **That file and its copy strings are
kept in this folder for exactly that reason.**

## Called rather than asked

1. **The note cites the DECLARED bracket, and nothing else.** The alternative — the last determined
   verdict — is the trap: it may be four edits old, and a row has nowhere to say so. Undeclared
   therefore prints **no deck clause at all**, which is a real reduction in usefulness and the
   honest one.
2. **Two registers, not one.** Hedging the list lookup as well would teach the reader the hedges
   are decoration, and the hedge on the two detections that need it would stop working.
3. **The hedge is authorship, not doubt.** *We read this as* is checkable and tells the player
   which half to argue with; *possibly* is neither.
4. **One trigger, on the tab, in one position.** Every other placement re-imports a per-edit
   reminder of the deck's standing.
5. **The dot carries no number.** A count invites the reader to judge whether four edits is enough
   to bother with, which the app cannot help them do.
6. **Asked and committed read identically.** Two phrasings would imply two different kinds of
   knowledge about the same computation.
7. **Past tense on the stale verdict**, and the bracket mark dims with the sentence. Round 0 could
   keep its figures bright; here the figure is the stale thing.

## Engineering list

| # | Item | Size |
|---|---|---|
| 1 | **Card-note facts per candidate** — is-game-changer (list), MLD and extra-turn detections, is-tutor, completes-a-held-combo — **without a deck profile** | data shape on the add surfaces' existing card payload |
| 2 | **Count of a kind in the current list**, available to the add panel and the top-off list | client-side over data both already hold |
| 3 | **The declaration readable from both add surfaces** | wiring |
| 4 | **`determinedAt`, `determinedCardCount`, and a changed-card diff** stored with the verdict | persistence — the only new stored state in the round |
| 5 | The trigger, three weights, one position; the tab dot | one component + a tab-label affordance |
| 6 | Copy module(s) from `card-note - copy strings.ts` | mechanical |

**Not in the list:** `bracketDelta` on any add surface, any per-edit computation, any change to
Round 1's marks, and any new token, glyph or colour.

## Corrected after review

**The bracket marks were hand-drawn and off-spec.** Every instance is now lifted verbatim from
`design_handoff_the99_deck_analysis/assets/bracket-marks.html`: the additive construction
(diamond · mid ring · cardinal ticks · studs · closed outer ring) at a **sanctioned size** — full
mark at 26 in the verdict head, chip form at 22 where a mark sits inline. The previous drawing
rendered rank 3 with no cardinal ticks, which is the sheet's construction for rank 2, **so the
mark stated the wrong rank**; and 30px is not a sanctioned size. **The same correction is applied
to the superseded push-line canvas**, which ships in this package as the verdict's copy reference.

## Gaps and open items

1. **The note's most useful clause depends on Round 3 shipping.** Declaration is where *your
   bracket* comes from. If Round 3 slips, the note ships in its undeclared form — card fact and
   rules fact only — which is drawn and deliberately plain, not a placeholder.
2. **Auto-analyse on tab open is rejected on a guess.** If a full pass is genuinely free, it
   removes the stale state entirely — and removes the player's ability to compare a verdict against
   the edits made since, which is the thing §1f is built to give them. **A measured run time would
   settle it; nobody has one.**
3. **The changed-card diff needs a stored snapshot**, which is the round's only new persistence. If
   that is expensive, the stale block degrades to the tag and the denominator without the list, and
   loses its best line.
4. **Commit-time determination assumes commit is already snapshotting.** If versioning does not
   store a card list at commit, item 4 grows and §1e's *committed never goes stale* needs revisiting.
5. **Ordinals** need a formatter; locale is unspecified in this project, as it is for money.
6. **The MLD and extra-turn detections' error rate is unmeasured.** The register is designed to
   survive that (the hedge is on the detection, the rules clause is flat), but **if the false-positive
   rate is high enough to be noticed, the remedy is a better detection, not a stronger hedge.**
7. **Nothing tells a player the card note exists**, and it appears on a minority of rows. Accepted,
   as in R2: a legend for a usually-absent slot is worse than the absence.
