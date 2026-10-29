# Brief: Overview, iteration 3 (the stages renderer)

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Existing handoffs to extend:** `design/design_handoff_the99_analysis_tab/SYNOPSIS-modal.md` (the full Overview
modal), `design/design_handoff_the99_small_items/Precon-Overview.dc.html` (the precon page's Overview). Where a
shipped component and a handoff disagree, the component wins.

## Today (390 and desktop)

The deck's Analysis tab and the precon page draw the Overview paragraph, then `View full overview →`. The modal
(`SynopsisSections`, `src/components/decks/synopsis-body.tsx`, 700 wide) draws four sections under mono labels:
Overview, Primer (Core strategy as numbered steps, Mulligan as Keep and Send back hands, one column on a phone and two
from `md`, each led by the fixed land range, "2 to 4 lands"; Key tips with a left rule), Key cards (name over job on a
phone, a 210px name column from `md`), Weaknesses.

## Iteration 3 (Hugh, 2026-10-29)

1. **Stages:** exactly three lines, labeled by position Early, Mid, Close, each naming deck cards.
2. **Key cards:** 5 to 8, none already explained in a stage.
3. **Tips:** exactly 2, each naming at least 2 deck cards.
4. **Land keep line:** one deck-specific line, at most 120 characters, replacing the fixed range ("4 lands fits a
   40-land deck with 11 spells costing five or more.").
5. **Alternate commander:** one line, **precon only**, when the box carries one. A player's own deck and a precon
   without one must read complete without it.
6. No Wins by line.

Live examples: [`overview-i3-samples/`](overview-i3-samples/README.md), three decks (a precon with an alternate
commander, a second precon, a player's own deck), each a static page showing today's Overview beside the new shape.

## Asks

How the stages read; where Key cards and the 2 tips sit; where the land line and the alternate line go; the
precon-with-alternate and player-deck forms side by side; phone and desktop for each.

## Constraints from the code (`src/lib/synopsis/stages.ts`, `limits.ts`)

- `STAGES_LIMITS`: 3 stages, 144 characters each; alternate 144; land line 120; tips 2.
- `SECTION_COUNTS.keyCards` 5 to 8; Keep and Send back 1 to 2 lines each; Weaknesses 1 to 3.
- Every `[[Name]]` mark renders as a card link (`CardName`: dotted accent underline, hover preview, press
  opens the card), in every line.
- A refused section keeps its label and draws the refused slot, as today.

## Not in scope

The copy and labels (`/copy-review`), the generation, the prompt and its cost.
