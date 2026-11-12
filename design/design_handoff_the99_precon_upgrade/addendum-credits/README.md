# Upgrade this precon · addendum: the credits path

`design_handoff_the99_precon_upgrade/addendum-credits/` · 2026-11-12 · account 2

**Status: APPROVED by Hugh 2026-11-12 as R1b.** R1b (Hugh, 2026-11-12) replaced the landing's three-times picture, which was no longer accurate. Canvas: https://claude.ai/artifact/2ezoAQb6aVigdTAYFZu4uE

**Brief (Hugh, 2026-11-12).** This addendum covers how Upgrade this precon talks about credits, plus one landing row.
- **The 1-credit dead end.** A player with 1 free credit goes through Bracket and Strategy, then finds `Upgrade toward …` off (`An upgrade uses 2 credits, and a free credit covers 1`). The intro's `1 of 1 left · this run uses 2` doesn't warn them, and even with payments on there's no way through to Credits. Decide where the shortfall is said and where the path to more credits sits.
- **The landing's paid tools.** Add Upgrade this precon to the "With credits" list.

**Locked:** an Upgrade costs 2 credits, a free daily credit covers 1, and welcome credits stay at 15. Everything else in R2d and A2c stays as approved.

**How it was drawn.** Every frame is a PNG of the shipped components, rendered with the shipped CSS in Low Sun: `UpgradeFlow` over R2d's precon page, and the landing's `Credits` section. Each was rendered from a scratch copy of main with `scratch-gen/crpatch.diff` applied. That diff is the proposal written as code, for reference only. It follows the A3 recipe in `design_handoff_the99_public_landing/scratch-gen/a3/`. The fixture is R2d's: Prismari Artistry, Muddle at bracket 3, Spells. Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `Main.dc.html` | The calls, the gaps, and one frame of each change |
| `C1-Intro.dc.html` | The intro at 1 and 0 credits, with payments on and off (390 and 1300) |
| `C2-Last-Step.dc.html` | Strategy and its press in the same four states |
| `C3-Back.dc.html` | Back from Credits with a pack bought: the picks are kept and the press is on |
| `C4-Landing.dc.html` | "With credits" shipped, with Upgrade, with its tip open, and with welcome credits and payments off |
| `STATES-credits.md` | Every state, with Must-nots |
| `copy strings.ts` | DRAFT strings |
| `scratch-gen/` | `crpatch.diff`, the render scripts and the board generator (`cr.py`, which uses the parent's `kit.py`, `up.py` and `up2.py`) |

## Design's calls

1. **Say the shortfall before the first pick.**
   - On the intro, the `2 credits a run.` line gets one more sentence in the credit line's warning ink (`--warning`, the ink expiring credits already use): `A free credit covers 1, so you'll need more credits to run one.`
   - The intro's mono standing line (`1 of 1 left · this run uses 2`) doesn't show in this state, so the shortfall is said once.
   - At the press it's said again in the shipped words: `An upgrade uses 2 credits, and a free credit covers 1.`
2. **The same words at 1 credit and at 0.** A free credit covers only 1, so waiting for it never makes the run possible.
   - At 0, the press line drops the shipped spent form (`0 of 1 left · reset at 2:01 AM · What uses credits?`), because the reset time suggests that waiting would help.
   - The paid daily limit (L5), the owner's testing share and the pause keep their shipped lines.
3. **The path to more credits is the shipped `Get more credits →` link** (`GetMoreLink`, L4's own line, to `/credits`).
   - It sits under the intro's sentence and under the press's line, and shows only while payments are on.
   - With payments off there's no link, and the intro's sentence reads `A free credit covers 1, so an upgrade can't run on free credits alone.`
4. **Nothing is locked.** `Next · Commander` stays on. Looking through who leads, the brackets and the strategies is free, and a player can buy credits part-way through. Only `Upgrade toward …` is off, as shipped.
5. **Coming back from Credits keeps the picks.** After a purchase, going back to the precon reopens the flow at Strategy with the same picks, and the press is on (C3). Without this, the link costs the player their three picks, and the dead end just moves somewhere else.
6. **The landing lists Upgrade this precon** as the last row of "With credits".
   - It's priced `2 credits` and has an ⓘ tip and an example, like the other rows.
   - While it's listed, the chip reads `1–2 per run`.
   - **R1b: the three-times picture becomes a cost strip.** Hugh flagged the picture as no longer accurate. It was already off, since Changes can take 2 credits, and six tools don't fit three times into 15.
     - The strip is labelled `What one run costs`, with one tile per paid tool and a diamond for each credit a run takes.
     - Changes shows ◆◇: the hollow diamond is for runs above 10. Upgrade shows ◆◆.
     - The sentence becomes `That covers every tool at least twice before you spend a thing.` That's 14 of the 15 credits at each tool's low cost. The v2 form adds `(Suggested changes, up to 10 changes)`.
   - The row shows only while `PRECON_UPGRADE_ENABLED` is on app-wide, like every promise on the page.

## Gaps for engineering

- **G22 · Back from Credits.** When `Get more credits` leaves the flow, keep its picks per precon (in session storage), and reopen at Strategy when the player returns. `/credits` has no return link today, so for now the return comes from the browser's Back or the next visit.
- **G23 · When the shortfall shows.** It shows when `runFunding(allowance, 2)` is `short`, or `spent` with `creditLineKind` = `spent`. Mixed lots (1 free and 1 welcome, or 1 welcome alone) are also `short`, since one source funds a whole run, and the same sentence holds there.
- **G24 · Landing claims.** Add `LandingClaims.upgrade`, read from the app-wide `PRECON_UPGRADE_ENABLED`. While it's on, the cost strip replaces `ThreeTimes`, and the twice sentence shows only when the grant covers every tool twice at its low cost (a check beside `coversEveryToolThreeTimes`).
- **Shipped divergences found while drawing.**
  - R2d's Strategy board drew `Get more credits` at 1 credit, but the build left it out (`upgrade-flow.tsx:143` uses `freeOnly` without `withMore`).
  - On desktop, a foot with no line slides its presses to the left. `md:ml-auto` on the press group keeps them on the right (it's in the diff).

## Not drawn
- Commander and Bracket at 1 or 0 credits. They're as shipped, because the shortfall is said on the intro and again at the press.
- The deck page's flow (A2c). The same states apply there unchanged.
- The tip on the landing's last row overhangs its card on a phone. That belongs to the phone-tips addendum.
