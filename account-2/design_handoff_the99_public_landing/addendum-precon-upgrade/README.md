# Public landing · addendum A5: a Precon Upgrade step in the demo

`design_handoff_the99_public_landing/addendum-precon-upgrade/` · 2026-11-15 · account 2

**Status: A5b (R2), awaiting Hugh's review.** R1 (2026-11-15) was LGTM'd by Hugh on 2026-11-18 with one change: Precon Upgrade's result had just moved to the Suggested changes system (Upgrade fresh-start R2, `design_handoff_the99_precon_upgrade/addendum-fresh-start/`), so the step follows it. Canvas: https://claude.ai/artifact/Eb1daYtVt3wLjAbSTLPvfN (the A5 column, right of A4, now titled A5b).

**Brief (Hugh, 2026-11-15).** "Add a 'Precon Upgrade' section to the 'try it' live demo on the landing page." A canned result with no live run. Engineering is moving the free and credit labels onto each step and tab, so the new step carries its own credit label the same way. Open for Design: where the step sits, which demo precon it runs on, and what the visitor selects and sees.

**Depends on.** The Upgrade fresh-start R2 build (its `ResultView` over the shipped `SuggestedChangesRun`). This step ships after it.

**What doesn't change.** Everything else in `design_handoff_the99_public_landing/` (R4, A1 to A4): the dialog, the bar's look, Back and Next, the other eight steps' bodies, the card details, the end. Only the step count moves from eight to nine.

Every frame is the shipped demo dialog (`demo.tsx`'s markup and classes, copied static) with `ResultView` as Upgrade R2 draws it inside (its head, then the shipped `SuggestedChangesRun`), rendered with the shipped CSS and fonts. The proposed step is `scratch-gen/demo-step-upgrade.proposed.tsx`; the copy is `scratch-gen/landing-copy.diff`; the one prop it adds (`demo`, on R2's `ResultView` and on `SuggestedChangesRun`) is `scratch-gen/demo-prop.diff`, written over the R2 scratch patch (`fspatch.diff` in the fresh-start addendum).

| File | Holds |
|---|---|
| `A5-Calls.dc.html` | The nine steps, the three calls, the start card with "nine", copy, engineering notes |
| `A5-Phone.dc.html` | 390 as it opens, the whole column (recommended), after dropping one of each, uneven picks, and 320 |
| `A5-Tablet.dc.html` | 768 and 1024 |
| `A5-Desktop.dc.html` | 1300 as it opens (recommended), the whole app side, and after dropping one of each |
| `A5-Themes.dc.html` | 390 in all six themes |
| `STATES-precon-upgrade-step.md` | Every state, with Must-nots |
| `READINESS.md` | Readiness |
| `art/` | The board images, also uploaded to the canvas |

## Design's calls

Calls 1, 2 and 7 stand from R1. Calls 3 to 6 are new in A5b; R1's Show all trim, `limit` prop and "no foot" call are retired.

1. **Step 7 of 9, after Suggested changes, before Get it to 99.** Suggested changes and Upgrade both write swaps for a deck: one tunes a deck Wren built, the other starts from a box. With R2 they also look alike, so step 7 reads as the lists the visitor just met in step 6, started from a box. Get it to 99 and Buy only what's missing stay last. The bar gets nine segments and reads `Step 7 of 9`. The section's lead and the start card say **nine of the tools**.
2. **The precon is Prismari Artistry**, the Upgrade handoff's own fixture: led by **Muddle, the Ever-Changing**, bracket **2 → 3**, toward **Spells**, 14 adds and 14 cuts. A different commander leads, so the Commander pair sits above the lists, the one thing no other step shows.
3. **The step is Upgrade R2's result.** Under `DemoHead` (the precon's name and `read-only`) the step draws R2's `ResultView`: the title and date, the four facts (Led by, Bracket, To buy, Already yours), the Commander pair (no Pick on it, as R2), then the shipped Suggested changes lists. Those are **Additions** and **Cuts**, side by side from 1024 and behind the phone switch below it, grouped **By type / By role** (the deck toolbar's switch), with every line **✓ Picked** and the pinned tally **+14 in −14 out · stays at 99 · bracket 2 → 3 · Upgraded, as asked**.
4. **Picks work, and save nothing.** A visitor can drop or restore any line. The chips (`13 of 14 chosen`) and the tally follow, as in the real tool, through the demo's inert actions (nothing written, as every demo action). The demo can't re-read the bracket, so once picks change the tally drops the bracket half and keeps `stays at 99`. Uneven picks draw the shipped warning (`14 in, 13 out. Pick 1 more cut…`). Next always works.
5. **Left out, because they write or promise a write:** You asked (the run has no typed request here), the bar's Apply place and its "Nothing moves until you apply" line, Start the deck, and Try another strategy. `SuggestedChangesRun` gains one `demo` prop that does exactly this; R2's `ResultView` passes it on.
6. **Every swap shows.** R1 showed 3 then Show all 14 swaps because the run was one long list. The R2 lists split it in two behind a switch and group it by type, so one side is the length of a deck section and the trim isn't needed.
7. **What a visitor selects.** Any card name opens the demo's read-only card details (`DemoCardHost`, Find a deck locked). The ring is **Select a card** on the first addition's name (Archmage Emeritus here), its label above the name, clear of the Pick button. The credit label is **2 credits**, built from `UPGRADE_UNITS`, never a typed 2.

## Open for Hugh

- The uneven warning keeps the shipped copy "Pick 1 more cut to apply, so the deck stays at 99", though the demo has no Apply. Drawn as shipped so step 7 matches the real tool. The alternative is a demo-only line: "Pick 1 more cut so the deck stays at 99."

## Copy (drafts, for /copy-review)

- Title: **Upgrade this precon** (the tool's shipped name). Chip: **2 credits**.
- Line: *{player} picked who leads a precon, how strong it plays and the strategy. The 99 found {n} swaps toward that plan, every card added under $12, and says why for each.*
- Ring: **Select a card**. R1's **Show all {n} swaps** is retired.
- Section lead and start card: **nine** of the tools (was eight).
- Everything inside the result is Upgrade R2's and Suggested changes' shipped copy.

## For engineering

- **Fixture (G1).** `Projected.upgrade = { precon, panel, runId }` (a format bump): the `UpgradePanel` as `readUpgrade` returns it for the fixture account, holding the one run with its pairs mapped to lines as R2 does (`linesOf`). Make the run once on staging with the fixture account (2 credits: Muddle, bracket 3, Spells) and export it with `demo:export`. The drawn swaps are the Upgrade handoff's illustrative ones; the demo draws whatever the stored run holds.
- **`demo` prop (G2).** On `SuggestedChangesRun`: no You asked, no Apply place, the lead keeps only its count sentence, and the bar line shows only when it warns. On R2's `ResultView`: passed straight through. Picks stay in the component's local state; the demo's `actions` are inert. See `scratch-gen/demo-prop.diff`.
- **The step.** `demo-step-upgrade.tsx`: `DemoHead` (precon name, read-only) and `ResultView demo` inside the demo's providers, with `seedSet` from the run's bracket so the tally opens on `bracket 2 → 3`.
- **Renumbering (G3).** Steps after 6 shift by one: `StepBody` (new case 6; Get it to 99 is 7, Buy is 8), `cardStepsOf` (the Shopping deck at index 8), `ringTarget`/`ringPlace`/`stepCardIds` (new case 6; the step's card ids are every add and cut plus both commanders), a card-details chunk for the step, and the tests that count eight. `?demo=step-7` now opens Upgrade.
- **Order (G4).** Builds after the Upgrade fresh-start R2 build lands.
- **Phone bars.** Below 1024 two bars pin: the lists' tally, then Back/Next, as step 6.

## Not drawn

- The pick steps (Commander, Bracket, Strategy). The demo shows a stored result, so a visitor can't make picks it has no run for.
- The card details a name opens: the shipped demo modal and sheet (A2-Card-Details).
- Cards with no art in the frames are placeholders in the illustrative fixture, as on the approved Upgrade R2 boards; the build draws the fixture's own images.
