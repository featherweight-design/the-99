# READINESS — addendum: three answers

Approved 2026-09-26. Read `ADDENDUM-README.md` first. Copy: `addendum · copy strings.ts` (placeholder, owed to /copy-review).

## Build
1. The free match reads theme names joined by "or" as an any-of group, set codes and names as a set answer, and a fixed phrase list as own-only. No model call.
2. `HelpMeChoose` form: an All / Any join on Theme (greyed below 2 themes), a **Sets** field (the `FilterPanel` `triggerCount` treatment over the full catalog), and **Cards for the 99** (Any cards / Only cards I own). The budget caption changes with own-only.
3. Rank: within an any-of group, max; across answers, min. SETS RANK tags the limiting figure. Show only the group themes a commander fits.
4. `ReadAsBar` chips: `any of`, `printed in` (codes only; names in the accessible name), `the 99` (+ tail).
5. `ChooseRow` / `BestFits`: a set code tag after the pips. Under own-only, a COMMANDER mark and price, then `99 from your cards · N of its usual 99 are yours`.
6. Search: own-only caps the budget to the commander, and the fill buys nothing for the 99.
7. `NarrowNote`: `Any of the N themes, not all` as a widen option, and `Drop HOB or HOC` for sets. Own-only is never an option.
8. Seeded intent line and the Built from your answers block list the new answers.

## Tests to assert
- Hugh's sentence returns results, with three chips and nothing under Not used.
- Own-only never changes which commanders are listed, or their order.
- Own-only with a budget: the budget caps the commander price only.
- The set chip's width is the same for one code as for its trigger's reserved `Sets 9`.
- No narrow option ever offers a zero (eng's fix), including the any-of widen.

## Not drawn
- Type-line tribe matching and the never-zero fix (eng).
- A "commanders I own only" answer. Owned and unowned stay together.
- The fixture commanders are placeholders for real HOB / HOC cards.
