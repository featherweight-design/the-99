# Readiness — the verdict (Round 2 of 5)

**Self-assessed: 🟡 Yellow.** The surface is settled across four rounds of review and drawn on
three real decks at both widths. Yellow for two reasons that are both one-line fixes once someone
else supplies a fact, plus one open decision that belongs to engineering.

## Closed since packaging

**The bracket mark's contrast is settled** — `design_handoff_the99_verdict_addendum/` §3 rules the mark a graphical
object at 3:1, which resolves rank 1 on `--surface` without a hex change and moves the range's dim
to 0.65. New work for the contrast gate: **record its scope** — 4.5 applies to every bracket name,
count, allowance and sentence; 3:1 to the mark alone.

## What blocks a green

1. **The quoted rule fragments were transcribed from the brief, not from Wizards.** §6 locks
   *"the rules text is quoted, not paraphrased"*. `"not chained in succession or looped"` and the
   turn-six gloss came from the brief's own quotations. They survive only in the reference sheet
   behind `see all brackets` and in the superseded turns, but they must be checked against the
   published bracket rules before build. The copy file keeps quote and reading as separate
   constants so this is a swap, not a redraw.
2. **Two source citations are drawn as visible slots** — the two mass-land-denial lists and the
   extra-turn cross-check. I do not know which lists engineering ingested. **Naming them is
   required before ship**, because the panel's whole argument is that we credit our sources;
   inventing a citation would be worse than the gap.

## Open with engineering, not with design

**The `[3,4]` split.** `permits` is typed with five values and `slotDeck` is merged. The canvas
is drawn on the reading that **1–2 and 4–5 are the only pairs sharing card limits**, so a deck at 3
with a two-card infinite reads `3` and reports the combo as a finding that does not move the
answer. That needs a spec amendment. If `[3,4]` stays, the verdict block needs a second bullet
glyph meaning *not knowable from a list*, distinct from the declaration `?` — drawn in section 1a
of the canvas and ready to reinstate.

## Errata against earlier packages

- **`design_handoff_the99_deck_analysis/assets/bracket-5-cedh.svg`** is rank 4's geometry with rank
  5's numeral. Adopted Filigree adds *a cusp outside each edge* at rank 5. This canvas draws marks
  to match the Round 0 document, so the discrepancy is carried rather than silently corrected —
  Round 0 should reissue the asset before `BracketMark` is built from it.
- **Round 0's `README.md`** still describes the pre-climb ladder and section F, superseded by its
  own `HANDOFF.md`. Round 2's climb edits land on top of that stale description.

## Called, not asked

1. The standing limits table is **deleted**; the full rule set is a reference sheet behind one link.
2. The climb draws **three rungs**, not five.
3. Round 0's reserved violation card is **discarded**; a violation is a finding, not a verdict state.
4. Receipts open a **modal**, not an inline row, not a tooltip.
5. Tutors move **out of the climb into the findings**, with a `no limit` chip.
6. Findings are **tiles at desktop, rows at 390** — one component, one breakpoint.
7. A **zero has no control** and no rail.
8. The bracket mark **stays on every rung at 390** (22 / 26px) rather than dropping to a numeral.
9. Provenance is a **collapsed disclosure**, rewritten as four plain sentences, with game changers
   included as the no-caveat contrast.
10. Two new fact marks — **the lemniscate** and **drawn up** — and the rule that solid means a card
    on a list while stroked means a behaviour that loops.
11. The population line sits in the verdict block's foot under **What other players say**.
12. `see all brackets` and the provenance toggle are the only two non-modal controls on the tab.

## Data dependencies

- **`Violation.cards` and `ComboRef` must carry oracle ids and image uris**, not names.
- **Tutors must reach the findings block** from `UnquantifiedFacts`, shaped like the other four.
- **`counted: false` must reach the client** — it is why extra turns print `no cap`.
- **Source names and URLs ship from code** alongside the coverage sentences, including the two slots.
- **`population` nullable, not zeroed.**

Everything else is merged: `slotDeck` (#757), `BracketLimitReport`, `Violation`,
`UnquantifiedFacts`, `DetectionCoverage`, the three fact flags and the combo index (#749, #752).

## For Round 3, which builds alongside this

**The declaration lands in the verdict block's sub-line, not as a new shape.** The box has survived
four rounds of review at one size; the lean and the declared state belong in the sentence beside the
ringed `?`, replacing it. **And Round 4's upgrade path has already started leaking in**: the climb's
`to drop to here` rung says *cut 2 game changers*, which is one step from advice. It is defensible
here because it states a limit rather than a plan, but the boundary needs agreeing before Round 4
writes on top of it.

## Engineering list, in dependency order

1. `--fact` in `globals.css` for all six themes (Round 1's dependency, still open).
2. `BracketMark` with the `size < 20` numeral-only path (Round 0's component).
3. Two new fact marks; `MarkKey` gains two entries; the key ships in the same release.
4. The three-rung climb, with `n allowed` / `no cap` and no interactivity.
5. The findings block: five findings, tiles/rows breakpoint, the 44px phone rail, zero-state.
6. The receipt modal: one chrome, two bodies.
7. The provenance disclosure, with named and linked sources.
8. The `see all brackets` reference sheet — four rules × three brackets, quoted.
9. The population line, with its absent state.
10. The About entry and the `ABOUT_VERSION` bump — this surface's release.
