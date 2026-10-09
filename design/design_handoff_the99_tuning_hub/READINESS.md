# Readiness — Tuning hub R1

**Approved (LGTM, Hugh, 2026-10-09). Self-assessed: Green for the build, with three items engineering should settle in the plan.** Brief items 1–7 are drawn at 900 and 390. Item 8 (About) is deferred, as the brief says.

## Settle in the plan
1. **Proposed cuts' Look deeper is now in scope** (Hugh, landing feedback). The brief has tier 2 as eval-contingent. The canvases draw it (C2, C8, C9), so the roadmap and the eval should account for it.
2. **Suggested changes as two lists** changes the model contract: one rationale per card, each with its own countable citation (README open 8).
3. **Stop on a deeper look** (open 6). Keep it, or spend the credit on press.

## Still open for Hugh, not blocking
4. Curve-weighted pips vs Deck Stats' raw pips (open 1).
5. Free runs recorded once per list version (open 3).
6. A third door from Deck Stats' Mana colors card (open 2).
7. Tab names drawn against the shipped `Your deck · Analysis · Consider` (open 5).

## Flagged
8. Mana Balance's covers-the-cost target is a fixed table, owned by engineering and unspecified here.
9. The dork caveat is a counted sentence, not a weighting.
10. The 400ms delay on Proposed cuts' loading frame is a judgement.

## Read
- `tuning-panel.tsx`, `manifest-rows.tsx`, `suggestion-card.tsx`, `role-counter-strip.tsx`, `role-counter-cell.tsx`, `builder-spine.tsx`, `cards/card-fact-mark.tsx` (main).
- `deck-tuning.ts` cite keys, `decks-builder.ts` (`addPanelCopy`, `overCopy`), `help-me-choose.ts` (`deeper`), `credits.ts`, `package.json` (no icon library).

## Not read
- `builder-shell.tsx` in full (only its mount points, via the brief's line refs).
- `src/lib/intake/deeper-read.ts` internals.
- `AnalysisBanner`'s exact geometry. The neutral note is drawn in its role; substitute the shipped component.
