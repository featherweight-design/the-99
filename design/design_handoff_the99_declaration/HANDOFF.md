# The declaration — handoff package (R2, Round 3 of 5)

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
| **The answer** | `declared` is set and inside `permits` | the face resolves to that bracket's own chip + *You said X (n)* with `change` **inline** |
| **Skipped** | the player skipped, ever | one faint line + `say which`. **Never asked again** |
| **Drift** | `declaredOutsidePermits` | declared mark → permitted marks, one sentence naming the player's own changes, *your declaration stands*, `change what you said` |
| **The lean** | `lean` is non-null | **`HOW WE DETERMINED THIS BRACKET`**, one sentence, `see the reasoning` → the modal |

**No new glyph. Two retire:** the ringed `?` and the ringed `≈` (§4.4). `MarkKey` is untouched.

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
3. **Drift has exactly one cause.** Only 1/2 and 4/5 are declarable, so drift is always a deck
   crossing out of the range it was declared inside, always caused by the player's own
   re-analysed edit. There is no "we disagree" entrance and no `driftVoice`.
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

## Three things most likely to get broken in build

1. **Do not default `declared`, and do not write it from the lean or from a re-analysis.**
2. **Do not re-ask after a skip** — stored, permanent, per deck; survives re-import and
   re-analysis.
3. **Do not give drift an alarm treatment.** No `--danger`, no warning glyph, no toast, no badge.

## One for the backlog, not this round

**The overview is drawn at two paragraphs** (1e) where Round 0's generator writes two sentences.
The column is 740px and was carrying a caption. Raising the generator's length budget is an
engineering change, not a design one, but the space is drawn for it.
