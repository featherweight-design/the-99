# Bracket reach: Help me choose builds to the bracket it was asked for

**Bug:** Help me choose built "HD - Horrors Test" (Captain N'ghathrod, UB) for a TARGET of bracket 3; the analysis reads it as 1-2.
**Ruling (Hugh, 2026-10-20):** before the build and before a credit is spent, check with no model call whether the collection can reach the target bracket. If it cannot, tell the player and let them choose: build from the collection (landing in the lower bracket it can reach), or hit the target (adding unowned cards). Never pick for them.
**Findings:** `boards/priorities.md`, the FINDINGS line under the ruling. In short: the builder and the analysis already share every classifier (`violationsFor`, `permitsFor`, `comboLandsEarly`, `card_bracket_flags`, `cards.game_changer`, the counted-combo rule). The defect is that every bracket answer is a CEILING (`rank.withinBracket`, `bracketGate`, the summary copy) and nothing places a card to REACH it. Bracket 3 needs 1 to 3 Game Changers or a counted, non-loop, unassembled two-card combo. The deck had none, although the collection held a free Opposition Agent and three owned UB combos.

## What "reach" means

A deck REACHES its target when the target is in the permits of the finished list, by the analysis's own arithmetic: `permitsOf` (new, in `fill-gate.ts`, built from the gate's own helpers and `violationsFor` / `permitsFor` / `comboLandsEarly`). So `[1,2]` reaches 1 and 2, and `[4,5]` reaches 4 and 5.

| Target | A RAISER (smallest set added to the fixed cards that reaches it without going over) |
|---|---|
| any | none, when the fixed cards (commander, build-around card, `?select=` picks) already reach it: `kind: "fixed"` |
| 1, 2 | none: an empty 99 permits [1,2] |
| 3 | one Game Changer; or one counted non-loop two-card combo (a piece may be the commander) |
| 4 | four Game Changers in all; or a counted combo plus the searchers that find every piece (`comboLandsEarly`) |
| 5 | four Game Changers in all |

Mass land denial and turn loops are NOT raisers (plan review 3): seeding Armageddon or an extra-turn loop on the player's behalf to hit a number is not what "bracket 4" asked for. Their absence is stated in the module. A target of 5 is then reached only by Game Changers; an assembled combo permits `[4]`, not `[4,5]`. d9 can overrule.

Lands are excluded from raiser selection (review 4): a Game Changer land (Ancient Tomb, Gaea's Cradle) would go through the land sweep, whose caps can drop it, so the raiser would silently not be placed.

## Two sources, one answer

- **From the collection:** cards the player can sleeve (`buysCopy` false), in the fill's own scoped candidates. Preference: fewest cards, then the fill's own order (`byPreference`, exported from `fill.ts`).
- **By buying:** any card with a free copy or a live price. Fewest cards bought, then cheapest. Computed by the pure rule now (so the choice's two halves are one module); PLACED only by PR 3, behind the player's explicit yes.

## Result shape (`bracketReach`, `src/lib/intake/bracket-reach.ts`, pure)

`fixed` | `above` (the fixed cards already exceed the target) | `collection` (raisers) | `short` (`collectionPermits`, `collectionRaisers`, and `buy: { raisers, buyCents, overBudget } | null`, null under own-only or when nothing stocked reaches it).

## PR 1 (this run): collection raisers, a live fix with no UI

- `permitsOf` extracted in `fill-gate.ts` (the gate's `completes`/`reachesOf` moved to module scope and shared; gate behaviour unchanged).
- `bracketReach` + tests (the table row by row, overshoot refused, preference order, a commander piece, budget/own-only for the buy half).
- `loadBracketReachFacts` (`bracket-reach-load.ts`): the same reads `loadFillGate` makes for the bracket (flags, `cards.game_changer`, combo edges, `classifySearches`), plus availability. ONE read shared by the gate and the reach in `buildFillPlan`, so they cannot see different facts. `loadComboEdges` moves onto `isCountedCombo` (the findings' drift risk).
- `planFill` gains `raisers?: FillCandidate[]`, a step BEFORE the staples step: each is spent, told to the gate, credited to its roles, tallied by type, filed with `source: "bracket"`. It ignores `FILL_STAPLE_CAP`, obeys the slot limit and `pool: "sleeveable"`, and is told to the gate (`place`) without `admits`: the rule already proved the set stays inside the target. `FillRow.source` widens to `"staple" | "bracket"`; `isResidual` treats both as non-residual (review 7).
- `buildFillPlan`, with `answers.bracket` set and `BRACKET_REACH_ENABLED` on: computes the reach over its own scoped candidates (nonland, ordered by `byPreference`), the commanders, and `excludeOracleIds` as fixed; places `raisers` (`collection`) or `collectionRaisers` (`short`). Never a bought card. The create, the retry and the trial all go through `buildFillPlan`, so all three place the same raisers for the same inputs; the trial's own differences (no pool, no card; review 2) are PR 3's.
- Switch `BRACKET_REACH_ENABLED` (`feature`, needs `HELP_ME_CHOOSE_ENABLED`; staging on, production unset). Off: byte-for-byte today's fill.
- Proof: a `fill-plan`-level test where the finished rows are run through `permitsOf` and must permit the target (the analysis is the oracle); `scripts/measure-bracket-reach.mts` (read-only, staging: `MEASURE_USER_ID`, `MEASURE_COMMANDER`, `MEASURE_BRACKET`) prints the reach and the would-be raisers.
- Est. ~650 lines.

## PR 2: the Design brief (doc PR)

`docs/superpowers/design-briefs/2026-10-21-bracket-reach-choice.md`, and prompt 9 in the boards file (with the credits About artboard).

## PR 3: the choice (after Design's handoff and a readiness verdict)

Carries every piece whose only caller is the UI, so nothing ships dead:
- The FORM-level check: the read (the credit) is pressed from the intake form, before any commander exists, so "before a credit is spent" means the form must know first. `bracketReach` over the form's identity with no commander (fixed = []), read once per identity (review 9: catalog half cached per request).
- The per-row figure: `TrialFigures.bracket`, with the trial threaded the create's pool and card (review 2), and a test that trial, create and retry return the same raisers over one fixture.
- `decks.answer_bracket_buys` (not null, default false, `answerOwnedOnly`'s shape; review 10), written by the create and its empty-deck fallback, read by the retry; refused with the switch off, with no bracket answer, under own-only, unless the server's own reach is `short`, and when `buy.overBudget` (review 6: the player raises the budget or builds from the collection).
- Bought raisers become full `FillCandidate`s in `loadFillGate`'s candidates and `byOracleId`, as staples do (review 1).
- The "build from my collection" choice submits the lower bracket as the answer. The screen draws the outcome from the trial's actual rows (review 5), not from `collectionPermits` alone: under the "any" pool the fill can still place an unowned card the gate admits.
- Any cached results payload keys the new switch (review 12).

## PR 3 as built: the split and the board's amendments (2026-10-21)

Design's handoff (#2144, R1b, approved by Hugh) drew three surfaces; the readiness audit found no red, and d9 approved the
amendments below. PR 3 is split by surface, each one whole (no caller ships dead):

- **3a, the rows (B):** the buying half priced in `buildFillPlan` (`loadPrices` over the bracket-raising candidates;
  still never placed), `TrialFigures.bracket` by `permitsOf` over the trial's OWN rows (review 5: an "any cards" fill can
  buy a Game Changer the gate admits and read 3 with no raiser), own-only counting only the rows the player can sleeve,
  and the ownership line's `BRACKET` segment. Also fixes PR 1's free test, which passed `owned: true` for every raising
  candidate, so an unowned EDHREC top card could be called free and placed as a raiser (production never had the switch).
- **3b, the choice (C):** `decks.answer_bracket_buys`, the hand-off's two radio rows, *Create deck →* waiting for a pick,
  bought raisers as full `FillCandidate`s behind the player's explicit Hit, and "From my collection" submitting the
  highest bracket the collection permits (so a retry builds the same deck).
- **3c, the form (A):** one read when the form opens (the owned cards that can move a bracket, with their identity and
  facts), color changes rerunning `bracketReach` in the browser, the buying half per color identity on the catalog
  generation; the payload measured on staging for the busiest account.

Amendments to the PR 3 list above, each the board's call:
- **Over budget is pickable** (not refused): picking Hit raises the stored budget to what the placed cards and the raisers
  cost, and the raisers are charged to the cap first, as the build-around card is (G1).
- **Own-only offers Hit** (not refused): the buying half runs with `ownedOnly: false`; a bought raiser passes the
  sleeveable pool only behind the player's explicit Hit. The automatic fill still never buys.
- **The range** needs no rule change: `permitsFor` returns only [1,2], [2], [3], [4] and [4,5], drawn low-high.
- **Cache keys:** nothing caches the Help me choose results or the trial figures today, and `cachePageForUser` already
  keys every switch, so review 12 is a no-op.

**Ruling (a), 2026-10-22:** the form names a card to buy only when every result could offer it. None can: a
result's buying half is its commander's own candidates, and the one shared part (the universal staples) holds no
Game Changer, which the staples step never seeds anyway. So the form's estimate is the collection alone: a short
caption states what the player's cards come to and leaves the buy to the commander, on the new deck. The catalog
read of Game Changers is gone.

## About

Whether the choice owes an About entry (or an edit to Help me choose's) is Hugh's call; prompt 9 asks Design to draw it beside the credits entry.
