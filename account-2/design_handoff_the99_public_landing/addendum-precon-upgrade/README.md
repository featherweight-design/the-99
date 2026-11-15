# Public landing · addendum A5: a Precon Upgrade step in the demo

`design_handoff_the99_public_landing/addendum-precon-upgrade/` · 2026-11-15 · account 2

**Status: R1, awaiting Hugh's audit.** Canvas: https://claude.ai/artifact/Eb1daYtVt3wLjAbSTLPvfN (the A5 column, right of A4).

**Brief (Hugh, 2026-11-15).** "Add a 'Precon Upgrade' section to the 'try it' live demo on the landing page." A canned result with no live run. Engineering is moving the free and credit labels onto each step and tab, so the new step carries its own credit label the same way. Open for Design: where the step sits, which demo precon it runs on, and what the visitor selects and sees.

**What doesn't change.** Everything else in `design_handoff_the99_public_landing/` (R4, A1 to A4): the dialog, the bar's look, Back and Next, the other eight steps' bodies, the card details, the end. Only the step count moves from eight to nine.

Every frame is the shipped demo dialog (`demo.tsx`'s markup and classes, copied static) with the shipped `ResultView` inside, rendered with the shipped CSS and fonts. The proposed step is `scratch-gen/demo-step-upgrade.proposed.tsx`; the copy is `scratch-gen/landing-copy.diff`; the one prop `ResultView` gains is `scratch-gen/resultview-limit.diff`.

| File | Holds |
|---|---|
| `A5-Calls.dc.html` | The nine steps, the three calls, the start card with "nine", copy, engineering notes |
| `A5-Phone.dc.html` | 390 as it opens, the whole column (recommended), after Show all 14 swaps, and 320 |
| `A5-Tablet.dc.html` | 768 and 1024 |
| `A5-Desktop.dc.html` | 1300 as it opens (recommended), and after Show all |
| `A5-Themes.dc.html` | 390 in all six themes |
| `STATES-precon-upgrade-step.md` | Every state, with Must-nots |
| `READINESS.md` | Readiness |
| `art/` | The board images, also uploaded to the canvas |

## Design's calls

1. **Step 7 of 9, after Suggested changes, before Get it to 99.** Suggested changes and Upgrade both write swaps for a deck: one tunes a deck Wren built, the other starts from a box. Get it to 99 and Buy only what's missing finish decks (the count, then the shopping) and stay last, so the end still follows the shopping list. The bar gets nine segments and reads `Step 7 of 9`. The section's lead and the start card say **nine of the tools**.
2. **The precon is Prismari Artistry**, the Upgrade handoff's own fixture. The run is led by **Muddle, the Ever-Changing** (the box's alternate), at bracket **2 → 3**, toward **Spells**, with 14 swaps. It shows the one thing no other step shows: a different commander leads, so the result opens with the Commander row. Mutant Menace (the landing's featured precon) would work the same, with whatever its run picks.
3. **The visitor sees one stored run, read-only.** The step's head is the precon's name with the `read-only` chip, as Suggested changes heads its run (`DemoHead`). Under it is the shipped `ResultView` unchanged: the title and date, the four facts (Led by, Bracket, To buy, Already yours), the Commander row, then the swaps grouped by the theme each cut came from.
4. **Three swaps first, then Show all 14 swaps.** The whole run is about 1,300px on a phone. Three show what a swap is (cut, add, price or `you own it`, and why) without burying Next. This is the same trim as step 4's marked rows and Show all 99: the control expands in place and nothing collapses it again. Group counts stay true to the whole run (`Cuts from Artifacts 10` while 3 show).
5. **What a visitor selects.** Any card name opens the demo's read-only card details (`DemoCardHost`, Find a deck locked), as on steps 1, 3 and 6. The ring is **Select a card** on the first swap's added card (Brainstorm here). Its label sits to the ring's right (`ringPlace` `right`), because a label above would cover the cut row and one below would cover the reason. Show all 14 swaps expands. Nothing else on the step does anything.
6. **No step tracker and no foot.** The result's title and facts already say all three picks, so the flow's tracker would only repeat them, truncated on a phone. Start the deck and Try another strategy both write, so the demo draws neither, as Suggested changes draws no Apply.
7. **The credit label is `2 credits`**, the step's own chip with the credit diamond, built from the claim the landing already reads (`UPGRADE_UNITS`), never a typed 2. The step holds one tool, so it has no tab label.

## Copy (drafts, for /copy-review)

- Title: **Upgrade this precon** (the tool's shipped name). Chip: **2 credits**.
- Line: *{player} picked who leads a precon, how strong it plays and the strategy. The 99 found {n} swaps toward that plan, every card added under $12, and says why for each.*
- Ring: **Select a card**. Control: **Show all {n} swaps**.
- Section lead and start card: **nine** of the tools (was eight).

## For engineering

- **Fixture (G1).** `Projected.upgrade = { precon, panel, runId }` (a format bump): the `UpgradePanel` as `readUpgrade` returns it for the fixture account, holding the one run. Make the run once on staging with the fixture account (2 credits: Muddle, bracket 3, Spells) and export it with `demo:export`. The drawn swaps are the Upgrade handoff's illustrative ones; the demo draws whatever the stored run holds.
- **`ResultView` gains `limit` (G2).** It draws only the first `limit` swaps; the title, the facts and each group's count still count the whole run. Nothing else on the precon page or the deck page changes (they pass no limit).
- **The step.** `demo-step-upgrade.tsx`: `DemoHead` (precon name, read-only) and `ResultView` inside the demo's providers, `UPGRADE_FIRST = 3`, and the Show all control in step 4's classes.
- **Renumbering (G3).** Steps after 6 shift by one: `StepBody` (new case 6; Get it to 99 is 7, Buy is 8), `cardStepsOf` (the Shopping deck at index 8), `ringTarget`/`ringPlace`/`stepCardIds` (new case 6; the step's card ids are every pair's cut and add plus both commanders), a card-details chunk for the step, and the tests that count eight. `?demo=step-7` now opens Upgrade; old links are fine to land a step early.
- **Allocation chips.** When result rows move to the shared allocation chips (in flight), the demo takes them with `ResultView`; nothing demo-specific.

## Not drawn

- The pick steps (Commander, Bracket, Strategy). The demo shows a stored result, so a visitor can't make picks it has no run for.
- The card details a name opens: the shipped demo modal and sheet (A2-Card-Details).
