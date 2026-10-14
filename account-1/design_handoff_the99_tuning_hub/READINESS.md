# Readiness — Tuning hub R1 + Proposed cuts R2 + Mana Balance R3

## Mana Balance R3 / R3a / R3b (LGTM, Hugh, 2026-10-11). Self-assessed: Green.
**Build from `… (R3b) · B Mana Balance, full view.dc.html`, frame F3** (the folded view), with F1 for each section open and F2 for the door before a pick. R3 (`evidence`) holds the thin and failed states (M6–M9), the staple and trade rows, and the About entry (M10). R3a (`pointer`) holds the rulings' per-deck frames: Gishath, Aang, Blood Rites, Wizards and Eldrazi. R1 B is superseded except B8 (count failed).

**Hugh's rulings, 2026-10-10 and 2026-10-11, all closed**
1. Evidence, never a verdict. No color is ever named on open. The only pointer is the order inside Improve my mana (tightest first, nothing selected).
2. You have · Needs on every pattern row, under a `Needed` column. Karsten is named only in the "What 'Needs' means" panel and the citation.
3. One door, Improve my mana. It opens a color step, which a one-color deck skips and a colorless deck never shows.

**Design's calls**
- **Needed** uses the step's rule: the color's tightest cost shared by 2+ nonland cards, commander excluded, ties in W U B R G order. It's the same in the color table, so the table and the step agree.
- **"What 'Needs' means"** is the shipped `StripRationale` disclosure, placed under the color table and in the step.
- **Hardest costs and Lands** are Consider's `ShelfSection` header, folded by default, with the folded state remembered per deck (`useFoldedShelves`).
- **Help rows** are information only: no Apply. Not hoisting the door is deliberate (see README).

**Settle in the plan**
1. **Folded state's key.** Per deck, shared with Consider's `useFoldedShelves` key or its own. Design's view: its own key, so a fold on one tab doesn't fold the other.
2. **Calibration.** `uploads/mana-pointer-calibration-2026-10-11.md` found no threshold that separates the colors Hugh calls short from those he calls fine. The step's order is still a true ranking, so it ships as ranked, never thresholded.
3. **`MANA_BALANCE_ENABLED`** is added to `AboutSwitch` for the About entry, on the Tuning line's batched bump.

**Flagged**
- Blood Rites' figures come from staging (the calibration file), not a committed fixture.
- Aang's and Wizards' help results and staple percentages are illustrative.

---

**R2 approved (LGTM, Hugh, 2026-10-10). Self-assessed: Green.** Proposed cuts is model-first per `docs/superpowers/plans/2026-10-09-proposed-cuts-model-tier.md`. The current canvas is `… (R2) · C`, with C1–C9 at 900 and 390. R1 C is superseded. PR 4 (UI) of the plan builds from these frames.

**Approved (LGTM, Hugh, 2026-10-09). Self-assessed: Green for the build, with three items engineering should settle in the plan.** Brief items 1–7 are drawn at 900 and 390. Item 8 (About) is deferred, as the brief says.

## Settle in the plan
1. **Proposed cuts' Look deeper is guaranteed work** (plan, roadmap sub-project 6). R2 draws it as the main path (C1–C7).
2. **Suggested changes as two lists** changes the model contract: one rationale per card, each with its own countable citation (README open 8).
3. **Stop on a deeper look** (open 6). Keep it, or spend the credit on press.

## Still open for Hugh, not blocking
- Re-offer after cuts from a deeper result (README open 9).
- A1 tile status ink: build in `--fg-muted`, not `--warning` (README open 10).
4. Curve-weighted pips vs Deck Stats' raw pips (open 1).
5. Free runs recorded once per list version (open 3).
6. A third door from Deck Stats' Mana colors card (open 2).
7. Tab names drawn against the shipped `Your deck · Analysis · Consider` (open 5).

## Flagged
8. Mana Balance's covers-the-cost target is a fixed table, owned by engineering and unspecified here.
9. The dork caveat is a counted sentence, not a weighting.
10. The 400ms delay on Proposed cuts' counting frame is a judgement.
11. R2's filled Look deeper uses `rgba(18,18,23,0.35)` (`--bg` at 35%) for its segment rule. That's a value, not a new token.
12. The shortfall slot copy names the missing ordinal (`A sixth`). Engineering needs an ordinal helper, or `/copy-review` rewords it.

## Read
- R2: `docs/superpowers/plans/2026-10-09-proposed-cuts-model-tier.md` (main).
- `tuning-panel.tsx`, `manifest-rows.tsx`, `suggestion-card.tsx`, `role-counter-strip.tsx`, `role-counter-cell.tsx`, `builder-spine.tsx`, `cards/card-fact-mark.tsx` (main).
- `deck-tuning.ts` cite keys, `decks-builder.ts` (`addPanelCopy`, `overCopy`), `help-me-choose.ts` (`deeper`), `credits.ts`, `package.json` (no icon library).

## Not read
- `builder-shell.tsx` in full (only its mount points, via the brief's line refs).
- `src/lib/intake/deeper-read.ts` internals.
- `AnalysisBanner`'s exact geometry. The neutral note is drawn in its role; substitute the shipped component.
