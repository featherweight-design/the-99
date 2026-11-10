# The 99: Upgrade this precon (design handoff, R2)

`design_handoff_the99_precon_upgrade/` · 2026-11-10 · account 2 · mirrors `design_handoff_the99_precons/`

**Status: R2, for Hugh's review.** Source of truth: `docs/superpowers/design-briefs/2026-11-10-upgrade-this-precon.md` (main). Hugh's five rulings and addendum A1 (who leads) are closed. R2 applies Hugh's R1 feedback (2026-11-10):
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

Glyphs are `strategy-icon.tsx`'s. **No new tokens, no new dependencies, no new motion.**

Fixture: **Prismari Artistry** (Rootha, Mastering the Moment, UR), illustrative; you own 41 of 85. The alternate is **Muddle, the Ever-Changing**, cut from Hugh's screenshot. Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `Main.dc.html` | The R2 calls, the gaps, the page at 1300 |
| `Entry.dc.html` | E1 the press, E2 a kept result, E3 nothing to upgrade toward |
| `Intro.dc.html` | I1 what to expect (drawer, dialog) |
| `Commander.dc.html` | C1 nothing chosen, C2 Muddle, C3 back to step 1 from later; C2 at 1300 |
| `Bracket.dc.html` | B1 nothing chosen, B2 3 chosen, B3 the two-step flow with no alternate; B2 at 1300 |
| `Strategy.dc.html` | S1 selected and the confirm, S2 out of credits, S3 the same picks as a kept run; S1 at 1300 |
| `Wait.dc.html` | W the wait (390, 1300), F failed and refunded |
| `Results.dc.html` | R1 fourteen swaps (1300, 390), R2 short, K reopened with kept results |
| `Start.dc.html` | S1 led by Muddle with the swaps (sheet, dialog) |
| `STATES-precon-upgrade.md` | Every state, with Must-nots |
| `precon-upgrade · copy strings.ts` | Proposed `src/lib/copy/precon-upgrade.ts`: DRAFT strings |
| `READINESS.md` | Self-assessed readiness and the gap report |
| `scratch-gen/` | The generator (`up2.py` for R2, over `up.py` and the announcements kit; `GEN=up2 python3 build.py`) |

## Design's calls

1. **One press on the page.** A single row under the Overview, above the list-note line: a ghost `Upgrade this precon` press with an up arrow, plus one mono line, `Swap 12 to 18 cards toward a strategy you choose · 2 credits a run`.
   - Full width on a phone; inline at 1300.
   - Nothing else on the page moves: the head's Start and Link a deck, the own box, the list and the phone dock stay as shipped.
   - With kept results the line reads `Kept: Spells, led by Muddle, bracket 3 · 14 swaps · Nov 10 · Open`.
   - No row at all when nothing can be upgraded toward, for any commander.
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
6. **Bracket is a choice.** Radio cards for 2 · Core, 3 · Upgraded and 4 · Optimized, each with one plain sentence.
   - The box's own is marked `where the box plays`, a source line and not a default.
   - Staying at 2 is an ordinary pick: tighter, with no Game Changers.
   - 1 is below the box and 5 can't be reached under $12, so neither is offered.
7. **Strategy and the confirm.** R1's cards, worked out for the chosen commander and bracket (`Worked out for Muddle at bracket 3`).
   - Selecting one turns the foot press into the confirm: `Upgrade toward Spells`, with `12 to 18 swaps · bracket 3 · uses 2 credits · this run uses 2 of 15 welcome`.
   - No dialog on a first run. The same picks as a kept run ask once, in the foot (`Run it again` / `Open Nov 10's`).
8. **Wait, failure and results stay in the flow.** The picks sit on one line, then v2's clock.
   - A failure gives both credits back and turns the press into `Try again`.
   - Results: the head line is `led by Muddle · bracket 2 → 3 · Upgraded, as chosen · 11 to buy · $13.95 · 3 you own`. Then comes the Commander group (Rootha `to the 99`, Muddle `leads`, not one of the swaps), then the pairs by the theme each cut came from.
   - The foot: `Start the deck with these 14 swaps` (S1) and `Try another strategy` (back to step 3, with the commander and bracket kept).
9. **Kept.** Closing loses nothing. Reopening with kept runs lists them first (strategy, who led, bracket, swaps, date), each free, with `New upgrade`.
10. **After results: Start the deck with the swaps** (R1's call stands). S1 gains a Commander fact, and the bracket fact reads `2 → 3 · Upgraded, as chosen`.
11. **No Pick toggle** (R1's argument stands).

## Not done this round
- The arrival on Your deck after Start is the shipped strip (S2), described in STATES only.
- The P3 state (only the free credit) reads as R1 and isn't redrawn in the flow.
- Amonkhet and other themes: not reviewed.
