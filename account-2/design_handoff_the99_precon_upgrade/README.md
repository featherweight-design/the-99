# The 99: Upgrade this precon (design handoff, R2c)

`design_handoff_the99_precon_upgrade/` · 2026-11-10 · account 2 · mirrors `design_handoff_the99_precons/`

**Status: R2c, for Hugh's review.** R2c: Hugh picked press B, as a bare button with the shipped line-pulse. R2b applies Hugh's R2 notes: the bracket step uses the shipped bracket graphics, the strategy examples are centred over their names, there's no upgrade history on the page, the press is louder (A and B drawn), and the new deck's Overview is proposed (call 12). Source of truth: `docs/superpowers/design-briefs/2026-11-10-upgrade-this-precon.md` (main). Hugh's five rulings and addendum A1 (who leads) are closed. R2 applies Hugh's R1 feedback (2026-11-10):
- The upgrade is a flow the player opts into from one press, so the precon's cards stay above the fold.
- The flow opens on what to expect.
- It then walks through Commander › Bracket › Strategy, one step at a time.
- The commander comes first because it decides the strategies.
- The bracket is the player's choice.

Canvas: https://claude.ai/artifact/BGMmU2uhRMixjsKrrSkN4F (R1 and A1 are in design-assets history: efc1be7, 266c791).

**About these files.** The boards are design references built in HTML. Open them with `support.js` beside them; `art/` holds the card images. They are drawn over:
- the shipped open precon page (`open-precon-view.tsx`)
- `start-precon.tsx` (S1, whose sheet and dialog chrome the flow reuses)
- Suggested changes v2's Wait and same-request ask

Glyphs are `strategy-icon.tsx`'s. **No new tokens and no new dependencies.** The only motion besides v2's wait line is the button's shipped `line-pulse`.

Fixture: **Prismari Artistry** (Rootha, Mastering the Moment, UR), illustrative; you own 41 of 85. The alternate is **Muddle, the Ever-Changing**, cut from Hugh's screenshot. Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `Main.dc.html` | The R2 calls, the gaps, the page at 1300 |
| `Entry.dc.html` | E1 the button (live pulse), E1p the pulse at its peak, E3 nothing to upgrade toward; E1 at 1300 |
| `Intro.dc.html` | I1 what to expect (drawer, dialog) |
| `Commander.dc.html` | C1 nothing chosen, C2 Muddle, C3 back to step 1 from later; C2 at 1300 |
| `Bracket.dc.html` | B1 nothing chosen, B2 3 chosen, B3 the two-step flow with no alternate; B2 at 1300 |
| `Strategy.dc.html` | S1 selected and the confirm, S2 out of credits, S3 the same picks as a kept run; S1 at 1300 |
| `Wait.dc.html` | W the wait (390, 1300), F failed and refunded |
| `Results.dc.html` | R1 fourteen swaps (1300, 390), R2 short |
| `Start.dc.html` | S1 led by Muddle with the swaps (sheet, dialog) |
| `STATES-precon-upgrade.md` | Every state, with Must-nots |
| `precon-upgrade · copy strings.ts` | Proposed `src/lib/copy/precon-upgrade.ts`: DRAFT strings |
| `READINESS.md` | Self-assessed readiness and the gap report |
| `scratch-gen/` | The generator (`up2.py` for R2, over `up.py` and the announcements kit; `GEN=up2 python3 build.py`) |

## Design's calls

1. **One press on the page (R2c, Hugh picked B).** Just the button under the Overview: `Upgrade this precon`, an accent outline on a 10% accent tint, full width on a phone and its own width at 1300. No icon and no line beside it, because the flow's first screen explains it.
   - **The eye-catch is the shipped `line-pulse`** (`globals.css`: a 2px accent ring at 55% that fades out). It plays twice when the button first scrolls into view on a visit, then rests. It doesn't run under reduced motion. The live board loops it for review.
   - Nothing else on the page moves. There is no button when nothing can be upgraded toward, and no history under it.
2. **The flow is S1's chrome.** The shipped sheet at full height on a phone (grabber, no ✕); a 720-wide dialog on desktop (bare ✕, Cinzel title `Upgrade Prismari Artistry`). The foot holds one primary press that names the next step (`Next · Bracket`) and Back.
3. **It opens on what to expect.** Five lines, each led by a mono figure:
   - `12–18`: we swap 12 to 18 cards, one in for each one out.
   - `$12`: no add over $12; cuts come from the other themes.
   - `3 picks`: who leads, the bracket, the strategy, in that order.
   - `2`: 2 credits a run, both back if it fails or comes up short.
   - `v0`: nothing changes until you start a deck, and the box stays v0.

   The foot gives the standing (`You have 15 welcome credits · this run would use 2`) and `Next · Commander`; `Not now` closes it.
4. **A three-part stepper.** `1 · Commander`, `2 · Bracket`, `3 · Strategy` sit under the title.
   - The current step is lit; done steps show their pick in accent, and pressing one goes back to that step.
   - Changing a pick clears only the picks that depend on it. A new commander clears the strategy and keeps the bracket; a new bracket clears the strategy.
   - Without a backed alternate, the flow has two steps: Bracket › Strategy.
5. **Commander.** As A1:
   - Card-shape art, one line on what it pushes, cost pips and `mana value N`, `N of its cards back it`, and `directions: …`.
   - Source lines, not badges: `the box's commander`, and Muddle's `a foil in the box · in its 99`.
   - Nothing is pre-selected. Next stays off until a pick.
6. **Bracket is a choice, drawn with the shipped graphics (R2b).** Rungs as in the shipped climb (`bracket-climb.tsx`):
   - Each rung has the bracket mark in its rank's ink (`public/brackets/*.svg`, `--bracket-N`; 26px, 36px on the picked rung at 1300), the name, and one plain sentence. At 1300 the layout is the climb's 186px label column plus the body.
   - The picked rung takes its rank's ink at 12% and its edge, like the climb's own rung, with an inked radio.
   - The box's own bracket carries `where the box plays` in the climb's role slot, and is not picked for the player.
   - Only 2, 3 and 4 are offered.
7. **Strategy and the confirm.** R1's cards, worked out for the chosen commander and bracket (`Worked out for Muddle at bracket 3`). The three example cards are centred over their names in equal columns (R2b).
   - Selecting one turns the foot press into the confirm: `Upgrade toward Spells`, with `12 to 18 swaps · bracket 3 · uses 2 credits · this run uses 2 of 15 welcome`.
   - No dialog on a first run. The same picks as a kept run ask once, in the foot (`Run it again` / `Open Nov 10's`).
8. **Wait, failure and results stay in the flow.** The picks sit on one line, then v2's clock.
   - A failure gives both credits back and turns the press into `Try again`.
   - Results: the head line is `led by Muddle · bracket 2 → 3 · Upgraded, as chosen · 11 to buy · $13.95 · 3 you own`. Then comes the Commander group (Rootha `to the 99`, Muddle `leads`, not one of the swaps), then the pairs by the theme each cut came from.
   - The foot: `Start the deck with these 14 swaps` (S1) and `Try another strategy` (back to step 3, with the commander and bracket kept).
9. **No history on the page (R2b).** A result isn't lost when the flow closes: the press opens on the newest result until the player starts a deck or runs another. Running the same picks again offers the earlier result for free (S3).
10. **After results: Start the deck with the swaps** (R1's call stands). S1 gains a Commander fact, and the bracket fact reads `2 → 3 · Upgraded, as chosen`.
11. **No Pick toggle** (R1's argument stands).
12. **The new deck's Overview (Hugh's question, proposed).**
   - The precon's Overview stays accurate for the precon page, which shows the box.
   - The upgraded deck is a new list, so the shipped carry-over (`carryOverPreconOverview`, `carryStoredOnArrival`) skips it, because those attach only to the precon's exact list. The deck would start with no Overview.
   - Proposed: Start writes the new deck's Overview for its own list and commander, included in the 2 credits, shown as an S1 fact (`Overview · written for this list as it starts`).
   - That is a second model call for each started deck, beyond ruling 3's one call per run, so it is Hugh's call.
   - Fallback: the deck page's shipped Write an Overview at the usual cost.

## Not done this round
- The arrival on Your deck after Start is the shipped strip (S2), described in STATES only.
- The P3 state (only the free credit) reads as R1 and isn't redrawn in the flow.
- Amonkhet and other themes: not reviewed.
