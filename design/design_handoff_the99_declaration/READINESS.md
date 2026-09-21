# Readiness — the declaration (Round 3 of 5)

**Self-assessed: 🟡 Yellow.** All five §4 calls are made, both widths are drawn, and drift — the
round's new state — is drawn for the first time in the line, and now drawn *possibly*. Yellow for
one data-shape change this round requires and two facts I cannot supply myself.

## Fixed in R3, from review

- **The parenthesised bracket numbers are reverted.** R2 wrote *Optimized (4)* in every face,
  sentence and rung; the mark beside each already draws the numeral. Names alone, with the number
  spelled only in the reasoning modal's heading — the one reference with no mark. The climb's
  label column returns to 186px.

## Fixed in R2, from review

- **Drift was drawn impossibly.** R1 showed *you said Upgraded*; 3 is never offered. Drift is
  now always a deck crossing out of the range it was declared inside (`1|2 → [4,5]`,
  `4|5 → [1,2]`), caused by the player's own edit-commit-re-analyse cycle, with one sentence that
  credits them with the movement. **R1's "reader overruled the lean" entrance was also
  impossible** — that is a declaration inside the permitted range — so it and the `driftVoice`
  tweak are gone. Open question 2 from R1 is **closed**, not carried.
- The declared state resolves the face to the declared bracket's chip; `change` moved inline.
- Split pills are labelled `split`; *Why this resolved here* → **How we determined this
  bracket**; receipts at card size under **How we determined bracket 4**; name + number
  everywhere (reverted in R3, above); overview drawn at length.

## What blocks a green

1. **`lean.receipts[].tutors` is the wrong shape for what this draws.** The contract on
   `feat/combo-decides` gives `{ combo, tutors: CardRef[] }` — flat per combo. The receipts group
   tutors **by the combo half they find**, and that grouping is the entire defence against the
   deleted "too many tutors" clause. Deriving it client-side means re-running coverage in the
   browser, which this surface must not do. **Needs `tutors` keyed by piece** — small change to
   the shape, none to the detection.
2. **A permanent skip needs its own stored state.** A nullable `declared` cannot express *asked
   and declined*, and the brief's §6 state list does not mention one. Second column or sentinel,
   engineering's call — but it must survive re-import and re-analysis.
3. **`declaredOutsidePermits` has no timestamp anywhere I can find.** The drawing survives
   without one — no date is printed, and *your last changes* is true regardless — but if a later
   round wants *you said this in March*, the column is not there today.

## Open with engineering, not with design

**The contract's doc comment is stale against the ruling.** `types.ts:58-61` still reads
*"Only when `permits` is `[3, 4]` — the one place the range is wide enough…"*, and `permits` is
still typed with `[3,4]` in the union. **The comment and the union both need to follow the
amendment**, or the next reader of the contract will rebuild the range this round deleted —
and with it the impossible drift state R1 drew.

## Called, not asked

1. **The ask is two chips**, 38px desktop / 44px at 390, under Round 0's lead line. Option B
   drawn and rejected on target size and on collision with the *opens a card* treatment.
2. **The ringed `?` retires**; answering resolves the face to the declared bracket's own chip.
3. **The ringed `≈` retires** (§4.4), replaced by a label. No glyph added; `MarkKey` untouched.
4. **Bracket names alone**; the mark beside them is the number. Spelled only in the modal heading (*How we determined bracket 4*), the one reference with no mark.
5. **Drift is a movement with one cause**, no red, no warning glyph, no "update".
6. **The lean's receipts group tutors by half**, print no count, carry no fraction, and show
   cards at 100×140.
7. **The reasoning modal carries no declare control.**
8. **The skip is permanent and stored**, with `say which` surviving.
9. **Three edits to Round 2's climb** — the 4–5 rung's copy, `reachable`, numbered rung labels.
10. **The overview is drawn at two paragraphs**, which is a generator-budget change for
    engineering rather than a design one.

## Data dependencies

- `lean.receipts[].tutors` keyed by combo piece (blocker 1). New this round.
- Stored permanent skip (blocker 2). New this round.
- `ComboRef` / `CardRef` with oracle ids and image uris, now at card size.
- `declared` writes: never defaulted, never inferred, never written by the client from a lean or
  from a re-analysis.

## Errata carried, not corrected

- **Round 0's `bracket-5-cedh.svg` is rank 4's geometry with rank 5's numeral** — confirmed in
  the R1 audit. This canvas draws marks to match the Round 0 document, so the discrepancy is
  carried rather than silently fixed.
- **Round 2's package claims tutors live in `UnquantifiedFacts`** — the audit corrected this to
  `profile.brackets.comboReach.tutors`. The findings tile here inherits the corrected source.

## For Round 4, which is briefed against this

**The push line must not become a "fix your declaration" path.** Drift deliberately has no
control that moves the declaration towards the cards. If Round 4's upgrade path offers *make this
a 4*, it is one tap from the app inferring a declaration, and the two rounds will be writing over
the same seam from opposite directions. **The boundary this package assumes: Round 4 changes
cards; only the player changes the declaration.**

**And the hole the brief recorded is still a hole.** With the boundary resolving, adding a combo
piece to a deck that cannot tutor for it moves nothing, and the push check is silent about it.
Round 3 draws no sentence for that case — Round 4 owns it.

## Engineering list, in dependency order

1. The `declared` write path — column, server action, and the **permanent skip** beside it.
2. `lean.receipts` reshaped to tutors-per-piece.
3. The sub-line's readings as one component — ask, declared (face resolves), skipped, drift, and
   the no-question case for `[2]` / `[3]`.
4. The ask row: chips at 38 / 44px, text-weight skip, no selected state.
5. The lean line and its label, on both `reachable` and `drawOnly`.
6. The reasoning body inside Round 2's existing modal chrome — a third body, not a component.
7. The drift row: two marks, arrow, labels, sentence, `change what you said`.
8. Round 2's three climb edits.
9. Live region updates for the lean and the drift states.
10. The overview generator's length budget.
11. The About entry and the `ABOUT_VERSION` bump.
