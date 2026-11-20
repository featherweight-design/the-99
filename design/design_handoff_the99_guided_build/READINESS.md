# Readiness · Guided build (R1)

**Approved (LGTM, Hugh, 2026-11-20), R1 as drawn, with one gate: a copy review before shipping.** Every string in `guided-build · copy strings.ts` is DRAFT until /copy-review resolves it; nothing ships on the draft wording. Self-assessed Yellow for the build: the UI is drawn over shipped components and reuses Upgrade's chrome, and nine engine and data gaps (README G1 to G9) are settled in the plan.

Every board was rendered headless from the shipped CSS: no cut-off board, no broken image, no em dash in a string.

**Build from** the boards and README. The Ready screen draws the deck's whole Overview (board R3); the picks board (P-Picks) supersedes call 4's first frames where they differ.

**The open questions, closed by the LGTM as drawn**
1. Free build is pre-marked on the new-deck screen.
2. Ready shows the four facts and the whole Overview, not a list of sharpened cards.
3. No cards-to-avoid step in R1.

**Settle in the plan** (README G1 to G9): build kind on `createDeck`; the engine over a deck list with per-deck runs; the whole Overview written inside the 2 credits; the pool input with a total budget; locked kept cards; run state on the deck; refunds; commander page copy; the picks read on the new-deck screen.
