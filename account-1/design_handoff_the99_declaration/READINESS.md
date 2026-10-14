# Readiness — the declaration (Round 3 of 5)

**Self-assessed: 🟡 Yellow.** R6 answers the audit's Orange — the draft state is drawn at both
widths in §3a, and rank 5's mark is reissued in §3b with two new asset files. Yellow for the
coverage gaps below, none of which blocks building what is drawn. R5 re-framed the declaration as
per-state, which removes the
round's only migration and most of its copy risk. The audit's one orange item is answered in **2a** — drift's four
shapes, both widths, with the downward sentence the round was missing. Yellow, not green, for the
skip's storage and the coverage gaps below; every item the audit resolved without Design is left
to engineering as recorded.

## Fixed in R7, from the R6 review

- **Precedence drawn (§3c): a version row suppresses the draft's out-of-range line.** The commit
  that refuses to copy an out-of-range declaration leaves both true; the row wins, because it
  names the old declaration and the new reading and carries a date. One test —
  `if (versionChange) row else if (draftMovedOut) line` — then the ask if the reading is a range.
- **The single-bracket draft is drawn** at both widths (§3a), in the order mark → reading → lean →
  superseded line, with no chips.
- **§3b's ranks 1 and 2 redrawn to match the files** (rank 1 had a mid ring it does not have,
  rank 2 two ticks it does not have), and the chip rule restated to the one that ships: it sheds
  the mid ring, and each rank keeps its own distinguisher. The collision is 1-vs-2, caused by the
  mid ring — not by ticks (R6) and not three wide (R7's first pass).

## Fixed in R6, from the R2 audit

- **The draft state is drawn** (§3a, both widths). The audit is right and R5's mechanism sentence
  was wrong: the analysis reads `deck_cards`, the live commander columns and
  `decks.declaredBracket` in one snapshot, so a re-analysis produces **no version**. A
  declaration is made on the **draft**; the commit copies it into a version.
- **The call: the ask returns, not a comparison.** §E compares two committed readings neither
  party can still edit — that is what makes a diff honest there. A draft is one moving reading,
  so a comparison would invent a second one and print a version number with no value. The
  question changed, so it is asked; the superseded answer is stated once, faint, passive.
- **The wording follows the stage.** *Declared Optimized.* on a draft, *…for version 2* once
  committed — one string with a conditional clause, so *for this version* never appears on a
  deck state that is not one.
- **At commit:** copy the declaration into the version only if it is inside that version's
  permits. Otherwise the version records no declaration, because the draft never answered its
  own question.
- **Rank 5's mark reissued** (§3b) — rank 4's four studs become a third closed ring: same points,
  same weight, footprint unchanged, silhouette different at chip size. **R8 consolidated the set:**
  ten files (five full, five chip) in Round 0's `assets/`, `bracket-5-cedh.svg` **is** the reissue,
  no `-reissued` suffix, and this package no longer carries an assets folder.
- **Both withdrawn artefacts removed** (audit items 3 and 4): the *"You said Core…"* live-region
  line in the copy file, and the `change what you said` control still drawn on §1b.

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

1. **The `permits` snapshot, per the audit.** §E needs the previous version's *reading*, and
   nothing stores it — producing it means a second `ProfileInput` from `deck_version_cards` plus
   another `buildDeckProfile` + `slotDeck` pass, measured at 625ms. My *"a version-history read,
   not a flag"* under-described that by an order of magnitude, and the audit's fix is the right
   one: **snapshot the version's `permits` at commit**, alongside `declared_bracket`, and §E
   becomes two column reads. Both belong in one migration.
2. **`lean.receipts[].tutors` is the wrong shape for what this draws** — flat per combo, where
   the receipts group tutors **by the combo half they find**. That grouping is the entire defence
   against the deleted "too many tutors" clause. **Corrected by the audit, in our favour:** the
   profile already carries `{ tutor, combo, piece }` on `comboReach.reaches` and `leanFor`
   discards `piece` when it dedupes, so this is a projection and not the re-derivation I billed
   it as. Still owed, still blocking the modal; cheaper than stated.
3. **`declaredOutsidePermits` carries two different states and should probably carry neither.**
   `slot.ts:130` sets it on the **draft** comparison, which §A5 draws as a returning ask; the
   **committed** comparison §E draws is a different observation (`v(n)` vs `v(n-1)`) that no
   flag stores. Both are computable at analysis time — the draft one from `permits` and the live
   `declared`, the committed one from the version's two snapshotted columns. **If the flag
   survives, it needs to name which of the two it means.**

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

Drawn at both widths: the ask, every sub-line reading, the lean, drift's four shapes (R4) and the
draft state (R6). Still prose-only, carried from the audit and not closed by §3a or §3b:

- the reasoning modal at 390, and the `drawOnly` modal body at either width;
- the command-zone `found by` reading — a half covered by the commander currently prints
  *nothing in this deck searches for it* under a header saying both halves are findable
  (audit item 5). A third reading is owed;
- **no loading, in-flight, failed or refused reading for the declaration's write.** Round 0 drew
  five synopsis states; this round's new write has none, so an implementer would invent one.
  Worth noting alongside the audit's cache finding: `profileFingerprint` includes
  `declaredBracket`, so **the one write this surface makes costs a full rebuild on the next
  read** — which is exactly the case an in-flight reading exists for, and it is the strongest
  argument yet for drawing one;
- **ranks 1 and 2 collided at chip size, on the mid ring. Closed in R9.** R6 blamed rank 2's ticks and R7 then
  over-corrected to a three-wide collision; both were wrong. `bracket-1-exhibition.svg` draws
  **one** path (the inner diamond alone), `bracket-2-core.svg` draws two (inner + mid), and
  **neither carries a tick** — the ticks arrive at rank 3. **The chip rule, as R8 states it: keep
  only the newest ornament** — the chip sheds the mid ring *and* every ornament below the rank's
  own (3 is ticks, 4 is studs, 5 is the closed ring), which is what the shipped two-path rank-5
  chip has always drawn. So **rank 2's only ornament was the thing the chip dropped.** **R9's
  ruling:** read consistently, rank 2's *newest* ornament is the mid ring — so rank 2's chip keeps
  the ring and drops the core, drawn at the chip's own radius 16.5. Rank 1 and rank 2 are now two
  lone diamonds 43% apart in linear size. `bracket-2-core-chip.svg` is redrawn; nothing else moved;
- **ranks 3 and 4 collided at chip size too. Closed in R9.** The shipped tick was 1.1 units — 0.6px
  at 22 — so 3 and 4 were both four dots at the cardinal points. Rank 3's ticks are now **spokes**,
  5.3 units from each core vertex out to the rim and attached to the core: 3 bridges core and rim,
  4 stays four detached studs. A topology difference, not a radius one. `bracket-3-upgraded-chip.svg`
  is redrawn; rank 4 is untouched;
- **the chip's label stays optional.** Pairing every chip with its bracket name would have made both
  collisions moot, but the chip exists to carry a rank where there is no room for a word (the
  deck-tile footer). The declaration's chips keep their names for reading, not for disambiguation.

The remaining items are Design's to draw when asked. None blocks building what is drawn.

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
8. **Three edits to Round 2's climb** — the 4–5 rung's copy, `reachable`, numbered rung labels.
9. **The overview is drawn at two paragraphs**, which is a generator-budget change for
   engineering rather than a design one.
10. **A changed reading is one row, one sentence, no control** — no direction, no second person,
    with *permits* / *reads as* for cardinality. A range on the new version is asked.
11. **No skip.** Two chips are the whole control.
12. **`change` stays on the declared reading** — it edits the current answer, and it is
    deliberately not *change what you said*.
13. **1e and 1f are captioned, not redrawn** — the ask and the lean cannot co-occur.
14. **The ask returns on a draft that has moved out**, rather than a comparison row; the
    superseded answer is stated once, passive, above the chips.
15. **The declared sentence names a version only once one exists** — *Declared Optimized.* on a
    draft, *…for version 2* after the commit.
16. **Rank 5 closes the ring** rather than gaining a fifth ornament — an escalation the cardinal
    points cannot carry at 22px.

## Data dependencies

- **`deck_versions.declared_bracket` and a `permits` snapshot**, copied at commit, the copy
  conditional on the declaration being inside that version's permits (blocker 1). New this round.
- **The version number the reader is looking at**, for the *for version n* clause — the tab has it.
- Stored permanent skip (blocker 2). New this round.
- `ComboRef` / `CardRef` with oracle ids and image uris, now at card size.
- `declared` writes: never defaulted, never inferred, never written by the client from a lean or
  from a re-analysis.

## Errata carried, not corrected

- ~~**Round 0's `bracket-5-cedh.svg` is rank 4's geometry with rank 5's numeral.**~~
  **Corrected in R6, consolidated in R8:** `bracket-5-cedh.svg` in Round 0's `assets/` **is** the
  reissued geometry — the old file is replaced, not kept beside it, so there is no current-file
  question. §3b draws the set at 40 / 28 / 22.
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

0. **One migration:** `deck_versions.declared_bracket integer` with the same `between 1 and 5`
   check `decks.declared_bracket` carries, **plus the `permits` snapshot**, both copied at commit
   exactly as `commander_oracle_id` already is — and the copy is conditional on the declaration
   being inside that version's permits. My earlier claim that a nullable per-version `declared`
   "was already in place" is **withdrawn**: the existing column is deck-scoped, and
   `deck_versions` has no such column.
0b. **Rank 5's reissued mark**, before `BracketMark` is built from the five files.

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
