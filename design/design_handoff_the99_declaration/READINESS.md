# Readiness — the declaration (Round 3 of 5)

**Self-assessed: 🟡 Yellow.** R5 re-frames the declaration as per-version, which removes the
round's only migration and most of its copy risk. The audit's one orange item is answered in **2a** — drift's four
shapes, both widths, with the downward sentence the round was missing. Yellow, not green, for the
skip's storage and the coverage gaps below; every item the audit resolved without Design is left
to engineering as recorded.

## Fixed in R5, from review

- **The declaration is scoped to the version it was made on**, and the app stops quoting the
  player. *You said X*, *your last changes* and *change what you said* are withdrawn; the
  declared reading is a statement of record, and a later version's differing reading is a
  two-line diff with **no control**.
- **Direction is gone with it.** R4's up/down sentence pair existed because a claim about the
  deck can be false in one direction; a comparison of two readings cannot be. One sentence now
  covers every shape, and cardinality (*permits* / *reads as*) is the only axis left.
- **A later version with a range is asked** — not re-asked, since it has never answered.
- **There is no skip.** Removed from the UI, the matrices and the copy.
  **Blocker 0 below is withdrawn with it:** no skip state, no migration. A nullable `declared`
  per version is sufficient, which was already in place.

## Fixed in R4, from the R1 audit's one orange item

- **Drift, re-drawn — four shapes, not two.** After the 2026-09-20 ruling `permitsFor` returns
  `[1,2] [2] [3] [4] [4,5]`, so the permitted side can be a single mark and the deck can have
  moved **down**. One row treatment for all four; two sentences chosen by `max(permits)` vs
  `declared` (*moved past* / *brought inside*); one word for cardinality (*permits* / *reads
  as*). The downward line ends on what the work bought — *it no longer needs the higher bracket*
  — because cutting a deck down is the harder edit and R3's *past* was simply false in that
  direction. Drawn at both widths in **2a**.
- **§5 agreed:** the ask and the lean cannot co-occur. 1e and 1f are captioned rather than
  redrawn — the composition is the only false part of either frame.
- **And the converse, caught in review:** drift and the lean *do* co-occur whenever the permitted
  side is a single mark, since `leanFor` fires iff `permits.length === 1`. 2a's `[3]` and `[4]`
  cards draw the labelled lean sub-section above the drift row; only the `[2]` card omits it,
  because 2 has no lean reason. **Drift never suppresses the lean.**

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

0. ~~**A permanent skip has nowhere to live.**~~ **Withdrawn in R5** — there is no skip. Saying
   nothing leaves the version unanswered, which a nullable `declared` already expresses. **The
   round no longer needs a migration.** What it does need is that `declared` be scoped to an
   analysis version and never carried forward.

1. **`lean.receipts[].tutors` is the wrong shape for what this draws** — flat per combo, where
   the receipts group tutors **by the combo half they find**. That grouping is the entire defence
   against the deleted "too many tutors" clause. **Corrected by the audit, in our favour:** the
   profile already carries `{ tutor, combo, piece }` on `comboReach.reaches` and `leanFor`
   discards `piece` when it dedupes, so this is a projection and not the re-derivation I billed
   it as. Still owed, still blocking the modal; cheaper than stated.
2. **A permanent skip needs its own stored state.** A nullable `declared` cannot express *asked
   and declined*, and the brief's §6 state list does not mention one. Second column or sentinel,
   engineering's call — but it must survive re-import and re-analysis.
3. **`declaredOutsidePermits` may not need to exist at all.** Per version it is the observation
   that `v(n)` reads differently from `v(n-1)`, computable at analysis time with nothing stored.
   The drawing needs the previous version's reading and its declaration — **a version-history
   read, not a flag** — which is the one thing R5 adds to the data it needs.

## Withdrawn — claims of mine the audit disproved

Recorded so they are not re-litigated. I read an older commit than I thought:

- *"The contract comment still reads `[3,4]`"* — already amended on `main` and on
  `feat/combo-decides` (#765).
- *"`permits` is typed with `[3,4]` in a union"* — no such union exists; `permits: Bracket[]`.
- *"Tutors-per-piece means re-running coverage client-side"* — the association is already on the
  profile (blocker 1 above).
- *"`ComboRef`/`CardRef` carry image uris"* — they do not, and per the audit they must not grow
  them: the profile is fingerprint-cached, so art resolves at the draw instead. **The 100×140
  tiles in 1d are unaffected as a drawing**, but the modal owns its own image loading.

One correction of my own, from the audit: **`declared.permitsBelow`'s trailing clause is false
for `[1,2]`** — Exhibition and Core differ by exactly the extra-turn limit, so "no card limits
between them" must be conditional on the range.

## Coverage

Drawn at both widths: the ask, all four sub-line readings, the lean, and (new in R4) drift's four
shapes. Still prose-only, carried from the audit and **not** closed by 2a:

- the reasoning modal at 390, and the `drawOnly` modal body at either width;
- the command-zone `found by` reading — a half covered by the commander currently prints
  *nothing in this deck searches for it* under a header saying both halves are findable
  (audit item 5). A third reading is owed;
- **no loading, in-flight, failed or refused reading for the declaration's write.** Round 0 drew
  five synopsis states; this round's new write has none, so an implementer would invent one.

All four are Design's to draw when asked. None blocks building what is drawn.

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
11. **A changed reading is one row, one sentence, no control** — no direction, no second person,
    with *permits* / *reads as* for cardinality. A range on the new version is asked.
13. **No skip.** Two chips are the whole control.
14. **`change` stays on the declared reading** — it edits this version's answer while the version
    is current, and it is deliberately not *change what you said*.
12. **1e and 1f are captioned, not redrawn** — §5 agreed.

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

0. `declared` scoped to the analysis version, never carried forward (replaces the withdrawn
   skip migration), and a read of the previous version's reading + declaration for the diff.

1. The `declared` write path — column, server action, and the **permanent skip** beside it.
2. `lean.receipts` reshaped to tutors-per-piece.
3. The sub-line's readings as one component — ask, declared (face resolves), skipped, drift, and
   the no-question case for `[2]` / `[3]`.
4. The ask row: chips at 38 / 44px, text-weight skip, no selected state.
5. The lean line and its label, on both `reachable` and `drawOnly`.
6. The reasoning body inside Round 2's existing modal chrome — a third body, not a component.
7. The version-change row: previous version's mark, arrow, this version's mark(s), one sentence,
   no control — plus the ordinary ask when this version has a range.
8. Round 2's three climb edits.
9. Live region updates for the lean and the drift states.
10. The overview generator's length budget.
11. The About entry and the `ABOUT_VERSION` bump.
