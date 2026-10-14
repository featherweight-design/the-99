# The declaration — handoff package (R6, Round 3 of 5)

**Canvas:** `The 99 - The Declaration.dc.html`. One turn, sections 1a–1f; `theme` switches
amonkhet / kamigawa in Tweaks, `demoState` seeds 1a's live card.

**Brief:** `docs/superpowers/design-briefs/2026-09-20-the-declaration.md` on `docs/round-3-brief`
(PR #764). **Frame:** Round 0 (`design_handoff_the99_deck_analysis/`). **Block:** Round 2
(`design_handoff_the99_verdict/`, PR #763) and its R1 audit. **Contract:**
`src/lib/bracket/types.ts` on `feat/combo-decides`.

---

## What Round 3 adds to the verdict block

| In the sub-line | When | Drawn |
|---|---|---|
| **The ask** | `permits` is `[1,2]` or `[4,5]` and `declared` is null | lead line, two chips carrying the bracket marks, a text-weight `skip this` |
| **The answer** | `declared` is set and inside `permits` | the face resolves to that bracket's own chip + *Declared **X**.* (`for version n` once committed) with `change` **inline** |
| **Unanswered** | the player says nothing | nothing extra — the ask stays on versions that have a range. **There is no skip** |
| **The draft moved out** | `declared` is outside the draft's `permits`, no commit since | one faint line + 22px mark, **then the ordinary ask** — see STATES §A5 |
| **A later version reads differently** | this version's reading ≠ the last one's | version 1's mark → arrow → this version's mark(s); **one sentence, no control**; if this version has a range, the ordinary ask follows — see STATES §E |
| **The lean** | `lean` is non-null | **`HOW WE DETERMINED THIS BRACKET`**, one sentence, `see the reasoning` → the modal |

**No new glyph. Two retire:** the ringed `?` and the ringed `≈` (§4.4). `MarkKey` is untouched.

## The declaration lives on the DRAFT, and the commit copies it into a version

The analysis reads `deck_cards`, the live commander columns and `decks.declaredBracket` in one
snapshot (`load.ts:77`), so **a declaration is made on the draft and a re-analysis produces no
version at all.** R5's *"a re-analysis produces a later version with its own reading"* was wrong
and is withdrawn.

- **Draft:** *Declared **Optimized**.* **Committed:** *Declared **Optimized** for version 2.*
  One string, one conditional clause.
- **When the draft moves outside what is declared on it, the ask returns** — one faint line
  naming the superseded answer, then the chips. **Not** a comparison row: a diff needs two
  settled readings, and a draft is one moving one.
- **At commit, copy `declared_bracket` into the version only if it is inside that version's
  permits.** Otherwise the version records no declaration.
- STATES §0 and §A5 are the matrices; §3a on the canvas is the drawing, both widths.

## Precedence: a version row suppresses the draft's line

Both are true after a commit that refused to copy an out-of-range declaration, and they say the
same thing in two voices. **The version row wins** — it names the old declaration and the new
reading, and it carries a date. `if (versionChange) row else if (draftMovedOut) line`, then the
ask if the current reading is a range. Nothing is deleted from the deck: the row *is* the
statement. §3c on the canvas, STATES §A5.

## What a version comparison is still for

This is the frame everything else follows from. Version 1 read as a range and a bracket was
chosen for it; that record is **complete and permanently true about version 1**. A re-analysis
produces a later version with its own reading, and the block's only job is to state both.

Consequences, all of them removals:

- **No copy quotes the player.** *You said X*, *your last changes*, *change what you said* are
  all withdrawn. A declaration is never stale, because it was never a claim about any version
  but its own.
- **The changed-reading state has no control.** Nothing is being corrected.
- **Direction disappears.** R4's two sentences (*moved past* / *brought inside*) existed because
  a claim about the deck can be false in one direction; a comparison of two readings cannot be.
- **There is no skip.** Two chips are the whole control; saying nothing leaves the version
  unanswered, and a version with a range is asked. **The permanent-skip state, its copy and the
  migration it needed are all withdrawn** — a nullable `declared` per version is sufficient.

## Naming: the name, because the mark carries the number

Every face, chip, pill and climb rung that names a bracket is drawn beside its mark, and the mark
is the numeral — so the label is the name alone. **The one exception is the reasoning modal's
heading**, the only bracket reference on the surface with no mark beside it: *How we determined
bracket 4*, with *Optimized* as its qualifier.

## The four calls most likely to be argued

1. **The ask is two chips, not two links.** Option B — bracket names underlined inside the
   sentence — is drawn beside it in 1a and rejected: a 17px target in a wrapping line, and the
   dotted underline already means *opens a card* on this surface.
2. **Answering resolves the face.** The split pill and its `split` label are replaced by the
   declared bracket's chip; the permitted range moves into the description line rather than
   disappearing. A declared deck is not still asking.
3. **A changed reading is a diff, not a verdict on the player.** One row, one sentence, no
   control, no direction. Cardinality is the only axis: a range *permits*, a single bracket
   *reads as*. If this version has a range, the ordinary ask follows underneath it.
4. **Drift has no "update" button.** The analysis is automated; the declaration is not. A control
   that copies one into the other makes the app the author of a sentence the player says at a
   table.

## Two consequences in Round 2's blocks

- **The climb's 4–5 rung loses its ringed `?`** and points at the answer: *the difference is how
  you play it, and the answer is in the block above.* One ask per surface.
- **The combo figure on the *your cards* rung reads `reachable`**, not `no cap`.

(The rung labels also carry numbers now, which widened the climb's label column 186 → 200px.)

## The receipts: one rule

**Tutors are grouped by the half they find** — never a flat list, never a total, never an `n of n`
in the header. Header: *How we determined bracket 4*, qualifier *Optimized · both halves
findable*. Card art is **100×140**: at this size the reader can check our working without opening
anything.

**No copy on this surface may imply "too many tutors."** That clause was deleted in October 2025.

## Drift and the lean DO co-occur

`leanFor` fires iff `permits.length === 1`, so a drift reading whose permitted side is a single
mark (`[2]`, `[3]`, `[4]`) also carries the lean line — except `[2]`, which has no lean reason.
Order: description, lean, drift row. Drawn on three of 2a's cards.

## The ask and the lean never co-occur

The ask needs a permitted **range**; the lean only fires on a **single** bracket. Frames 1e and
1f draw them in one card to fix size, order and label form — **that composition is not a
producible state.** Ship the ask on `[1,2]`/`[4,5]` and the lean on `[3]`/`[4]`, with two
live-region announcements. Both frames carry this caveat inline.

## Rank 5's mark is reissued — asset owed before `BracketMark`

`bracket-5-cedh.svg` was `bracket-4-optimized.svg` with a 5 in it: **all ten paths byte-identical**,
differing only in the numeral and a `dx` nudge. The set escalates at the four cardinal points and
rank 4 exhausts that budget, so rank 5 **joins rank 4's four studs into a third closed ring** —
same points `(20,1.2) (38.8,20) (20,38.8) (1.2,20)`, same `1.1` weight, footprint unchanged.
Silhouette: 4 is two rings and four dots, 5 is three rings.

**The whole set now lives in one place:** Round 0's `design_handoff_the99_deck_analysis/assets/`,
ten files — five full marks and five chip forms, `bracket-{rank}-{name}.svg` and `-chip.svg`.
`bracket-5-cedh.svg` **is** the reissue; the old file is gone and there is no `-reissued` suffix
to choose between. This package carries no assets folder of its own. See `assets/ASSETS.md` there
for the reduction rule. **R9 closed both 22px collisions** — rank 2's chip is the ring alone (no
core), rank 3's ticks are spokes from the core's vertices to the rim; ranks 1, 4, 5 and all five
full marks are unchanged. Canvas §3b draws the set at three demonstration sizes, 40 / 28 / 22;
**ship sizes are 26 / 36 / 44 full and 22 chip**, and `ASSETS.md` is normative on that.

**The chip rule, as amended in R9: one ornament per rank, chosen to survive 22px.** The chip sheds the mid ring
*and* every ornament below the rank's own — 3 is ticks, 4 is studs, 5 is the closed ring, each on
the inner diamond at 1.8. Earlier rounds' wording ("each rank keeps its own distinguisher") read as
cumulative and was contradicted by the one chip that shipped; the two-path rank-5 chip is correct
and the other four are built to match it.

**Two collisions at 22px, neither fixed here** — 1 vs 2 (rank 2's only ornament is the thing the
chip drops) and **3 vs 4** (both place four marks at the cardinal points, ticks vs studs, which is
thinner separation than 4-vs-5 got and was never tested at size). Both are Round 0 conversations.

## Three things most likely to get broken in build

1. **Do not default `declared`, and do not write it from the lean or from a re-analysis.**
2. **Do not re-ask after a skip** — stored, permanent, per deck; survives re-import and
   re-analysis.
3. **Do not give the changed-reading row an alarm treatment.** No `--danger`, no warning glyph,
   no toast, no badge, no directional or recoloured arrow — and no second-person copy.

## One for the backlog, not this round

**The overview is drawn at two paragraphs** (1e) where Round 0's generator writes two sentences.
The column is 740px and was carrying a caption. Raising the generator's length budget is an
engineering change, not a design one, but the space is drawn for it.
