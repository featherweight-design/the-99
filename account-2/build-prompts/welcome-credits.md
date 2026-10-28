# Build prompt · Welcome credits onboarding (R2)

Paste into Claude Code on your machine. PR #2149 is merged.

---

Build welcome credits onboarding (launch epic D2). Read `design/design_handoff_the99_welcome_credits/README.md` first, then `READINESS.md` and `STATES-welcome-credits.md`. Build from the `R2-*` boards; Line-and-Chip and Credits-Page come from R1. Where R1 and R2 differ, R2 wins. Open each `.dc.html` with `support.js` beside it. Work in a worktree under `.worktrees/`, as AGENTS.md says. The brief is `docs/superpowers/design-briefs/2026-10-18-welcome-credits-onboarding.md`. Everything is behind `WELCOME_CREDITS_ENABLED`, which needs `PAYMENTS_ENABLED`.

1. **Read the lot per request (G1).** Read units, what is left and the expiry from the welcome grant row, outside Home's cached payload, the same way the chip is read. `Partly spent` and `Used up` both depend on this read.

2. **The Home strip (R2-Placement, R2-States).**
   - It is one line, in the family of the Home's About line (the banner): the lot's diamond mark with the count, the line, `Where they work`, and a bare ✕.
   - **Placement:**
     - First-run Home (`FirstRunChecklist`): directly under the About line.
     - Dashboard: the top of the main column, over Ready to build. The right column stays Friends only.
     - At 390 it must sit above the fold on both.
   - **States:**
     - At 3 days out, the border, mark and count turn `--warning`. Never `--danger`.
     - Used up reads `You've used all 15 welcome credits.` followed by `See packs and the monthly plan` while payments are on and nothing has been bought. Otherwise it reads `Your free credit comes back each day.`
     - Expired and no lot render nothing.
   - **Dismissal (G2):** ✕ closes the strip for good. Store it per account, not in localStorage. A purchase never clears it. The strip also leaves on its own at the expiry date.

3. **The sheet (R2-Sheet).**
   - Use the shipped `SocialModal`: a sheet at 390 and a modal on desktop.
   - Contents, in order: title `Where credits work`; `creditsPageCopy.viewsFree` (the L6 line, identical); the grant line with its date; the five rows reused from `writtenForYouCopy.rows` as name, where and the short cost (no descriptions); then the teaser `See packs and the monthly plan ›` to `/credits`.
   - The teaser shows only while payments are on and nothing has been bought. Otherwise it is absent, never disabled. It is also absent when the sheet is opened from `/credits`.
   - **`Try it`:**
     - With no collection: no `Try it`. Show the shipped `Opens once your cards are in` lock line once, over all five rows.
     - Cards in, no deck: Help me choose comes first with `Try it ›`, then the shipped needs-a-deck line once, over the other four.
     - With a deck: About's order, with `Try it ›` on the three tools that have a landing.
   - Rows follow `captionLineSwitches` (G6).

4. **`/credits` Welcome cell (R1 Credits-Page, R2-Sheet).**
   - The cell reads `expire Nov 20`, in the reader's own day, rendered after hydration (G4).
   - `Where they work` goes on its own line under the date and opens the same sheet.
   - At 3 days it reads `expire in 3 days, Nov 20` in `--warning`.
   - The cell shows only while it holds a credit.

5. **Credit line and chip (R1 Line-and-Chip, G3, G5).**
   - Welcome gets its own segment in spend order: `1 of 1 free · 15 welcome · 40 paid`. The L3 form becomes `this run uses 1 of 15 welcome`, and `first` becomes `Uses a welcome credit.`
   - At 3 days, the tail reads `9 welcome credits expire Nov 20`.
   - The L5 limit names welcome among what is banked.
   - The chip stays one number. When a plan and the lot both expire within 3 days, the chip's line names the earlier one.

6. **Copy.** Every string is in `welcome-credits · copy strings.ts`. They are placeholders for /copy-review, except `viewsFree`, which is final. Never use "unlock". Promise nothing about converting leftovers on purchase.

7. **Tests and checks.**
   - Cover each row of the STATES matrix.
   - Check 390 and desktop in all six themes.
   - With payments off, no teaser or buy control renders.
   - Nothing arrives as a moment or over an open surface.
   - Run `pnpm check:copy-drift`.

The About `credits` entry was redrawn in #2144 and already names welcome credits. Whether this surface owes an entry of its own is Hugh's call at the launch About batch (G7).
