# Readiness Review — Where credits work, addendum: onboarding (R1b)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-12 (cold read against origin/main at 4bcda39f7, the PR head 7ab1df1f1 rebased-clean)
**Related ticket(s):** PR #2900 (this addendum); parent handoff `design/design_handoff_the99_welcome_credits/` (R2); context `design/design_handoff_the99_first_run_onboarding/`; sibling PR #2899 (precon upgrade, credits path)
**Plan PR target:** TBD

## Summary

The addendum is buildable on today's code with no Design round. Both asks are drawn at 390 and 1300: the sixth row in all three sheet shapes (locked, no deck, decks), and the first-run tour's new Credits stop. Every file, component and read it names exists as named (`WhereCreditsWork`/`Row`, `welcomeSheet`, `welcomeSheetFor`, `writtenForYou`, `writtenForYouCopy.rows`, `tourCopy`, `stepsFor`, `cutoutFor`, `placeCard`, `FirstRunTour`, `HomeTour`, `/decks/precons`, `PRECON_UPGRADE_ENABLED`, `UPGRADE_UNITS = 2`). `writtenForYouCopy.rows` has one consumer outside tests (`writtenForYou` → `welcomeSheetFor`), so the sixth row reaches only the sheet. No file conflict with #2899, which adds Upgrade to `landingCopy.tools` and never touches `discovery.ts`. Seven clarifications remain. The largest: the tour's step list is a module constant today, and the Credits stop's foot points at `Where they work`, which a used-up strip does not draw. The plan PR records each item below as a decision. Wording goes to `/copy-review`.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] The brief, the locks (15 credits, no bundle, name/where/cost, the two openers) and Design's calls 0 to 6 are stated in `README.md`. "Not drawn" names themes other than Low Sun, the dashboard replay and the /credits cell (same sheet).
- [✅] The why-not of the two rejected placements (sheet opening by itself; a list in the checklist, ruled in welcome credits R1) is recorded.

### 🎭 State coverage

- [✅] `STATES-onboarding.md` covers locked, no deck, decks, strip closed or no lot, the reader's switch off, payments off and expiring, each with a Must-not. Phone and desktop are drawn for every new surface (S1 to S3, O1).
- [🟡] **Used-up lot.** `stripFacts` returns facts for `usedUp`, so the strip draws, but it draws no `Where they work` (`src/components/welcome/welcome-strip.tsx:120-129`) and Home passes no sheet (`src/app/page.tsx:263`). A Credits stop there would point its foot at nothing. See clarification 2.
- [🟡] **Grant race on the first visit.** The lot is granted only by the Clerk `user.created` webhook (`src/app/api/clerk-webhook/route.ts:95`). A first Home rendered before it lands has no strip, so the once-only tour runs its six stops and the player never sees the Credits stop. The handoff's own state ("no lot: six stops") settles the drawing. See clarification 3.
- [🟡] Dashboard replay is not drawn (stated in "Not drawn"). The dashboard strip (`page.tsx:408`) is a different place in the layout from the first-run one. Nearest pattern: the same card, `banner` cutout, `below-start`, as `whatsNew` lights the line on both modes.

### 🔌 Data contract

- [✅] The 2 credits is real: `UPGRADE_UNITS = 2`, flat (`src/lib/precons/upgrade/constants.ts:12`). `/decks/precons` exists (`src/app/decks/precons/(list)/page.tsx`).
- [✅] G25: `PRECON_UPGRADE_ENABLED` is a registered switch (`src/lib/flags/flags.ts:27`), resolvable through `SWITCH_FLAGS` in `welcomeSheetFor` (`src/lib/payments/welcome-read.ts:135-136`), which already resolves `SUGGESTED_CHANGES_V2_ENABLED` the same way.
- [🟡] G25 as drawn in `wopatch.diff` gives `writtenForYou(suggestedV2, upgrade = false)` a default. A defaulted switch argument lets a future caller drop the row silently. See clarification 1.
- [🟡] **G27, the tour needs the rows.** `HomeTour` takes only `due`, `mode` and `precons` (`src/components/discovery/home-tour.tsx:19`), and the dashboard's `HomeTour` is built apart from the strip (`page.tsx:429`). The card's six names and costs, and whether the stop shows, must be handed in. See clarification 2.

### 🧱 Codebase fit

- [✅] No new tokens: the pill, rule and ink are `Row`'s shipped classes (`src/components/welcome/where-credits-work.tsx:37-61`). The `2 per run` pill follows the shipped `suggestedV2.short` `1 or 2 per run` (`src/lib/copy/discovery.ts:127`), and the screen-reader `cost` stays the row's.
- [✅] G26 fits `welcomeSheet`'s shapes (`src/lib/payments/welcome-sheet.ts:91-100`): Upgrade joins `help-me-choose` in `lead` for no deck, and `ROW_TOOL` is `Partial`, so a row with no tool id is legal. `tryHref` for `upgrade` is a fixed landing rather than a resolver state.
- [🟡] **The step list is a module constant.** `STEPS`/`DASHBOARD_STEPS` are fixed (`src/lib/discovery/tour-steps.ts:39-61`) and `TourRun` relies on that (`src/components/discovery/first-run-tour.tsx:195,274`). G27's "drops it when the strip has no target" would change the list mid-run. See clarification 2.
- [🟡] New types: `StepKey` gains `credits`, `Step.lit` gains `welcome`, `TOUR_TARGETS` gains `tour:welcome` (`src/lib/discovery/targets.ts:13-21`), and the strip registers it with `useTarget`, as `ArrivalsBanner` does `tour:banner` (`src/components/home/arrivals-banner.tsx:153`). `stepCopy`'s default branch covers the copy; the card's row list and foot are new markup.
- [🟡] The phone scroll exists only for step 1 (`first-run-tour.tsx:294`); every other stop scrolls to 0. The Credits stop adds its own case (14px under the top), per Design call 5.
- [🟡] Copy in `copy strings.ts` is DRAFT and goes through `/copy-review` into `src/lib/copy/discovery.ts`.

### ♿ Cross-cutting

- [🟡] **Reading order in R1b's `Row`.** The diff puts `Try it ›` before the where line and the pill in DOM order, so a screen reader hears name, Try it, where, cost. See clarification 5.
- [✅] The tour card already announces `n of N · place` from `STEPS.length` (`first-run-tour.tsx:273,364,427`), so 6 or 7 count with no copy change beyond `footSeven`.
- [🟡] Performance: no new read. The tour's rows come from the `welcomeSheet` Home already computes (`page.tsx:263-264`), so nothing is added to the first-run load.
- [🟡] Analytics: none stated. The tour's existing step events cover the new stop by key.

### ⏰ Drift from reality

- [✅] Every file, component, function and route the addendum names exists as named on origin/main. The shipped five rows, the lock and reason lines, and the teaser match the "shipped" frames.
- [✅] Consumers of `writtenForYouCopy.rows`: only `writtenForYou` (`src/lib/discovery/showcase.ts:125`), whose only caller is `welcomeSheetFor`. The sixth row reaches no other surface. Tests that pin five rows (`welcome-sheet.test.ts`, `showcase.test.ts`, `where-credits-work.test.tsx`, `welcome-strip.test.tsx`, `credits/balance.test.tsx`) move with it.
- [✅] Sibling #2899: no shared file. It adds `upgrade` to `landingCopy.tools` (`src/lib/copy/landing.ts`), gated on the app-wide switch, priced `2 credits` with a `1–2 per run` chip. The sheet gates on the reader's switch and prices `2 per run`. Each follows its surface's own rule, so this is not a conflict, but the two `what` lines describe one tool twice: `/copy-review` keeps them saying the same thing.
- [🟡] G28 is moot in code: no "six stops" string exists outside the tour (`src/lib/copy/discovery.ts:212`, plus comments in `tour-steps.ts:1` and `first-run-tour.tsx:4`, which the PR updates). About is image pages now, so any count lives in a picture, at Hugh's next About batch as the handoff says.

### 📝 Decision log

- [✅] Calls 0 to 6 are numbered, R1b's note is dated and attributed, and the gaps G25 to G28 are logged in the addendum's own `READINESS.md`.
- [🟡] The addendum's own `READINESS.md` says "Green for build". This audit holds it at Yellow for the seven clarifications below. None needs Design.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **The row's switch is required, not defaulted.** `writtenForYou(suggestedV2, upgrade)` takes both switches with no default, and `welcomeSheetFor` passes `isOn("PRECON_UPGRADE_ENABLED")`. The sheet's doc comments that say "five rows" are updated.
2. **The stop is decided by the server, once per run.** Home hands `HomeTour` a `credits` prop: the sheet's rows (name and `short`, `cost` for the screen reader) when the strip draws AND `welcomeSheet` is non-null (so not `usedUp`, not every row off), else null. `stepsFor(mode, withCredits)` returns one of four module constants, so the list stays fixed for the run. The strip's `tour:welcome` target lights it; a null rect falls back to the centred card as `whatsNew` does. The dashboard's `HomeTour` gets the same prop from the dashboard strip's facts.
3. **Grant race.** Follow the drawn "no lot: six stops" state. The plan measures how often the first Home renders before the webhook's grant (staging sign-ups), and if it is common, the tour's due check waits for the lot rather than the stop being forced. No change to the grant path in this build.
4. **Upgrade's Try it.** `tryHref` is `/decks/precons` whenever the row is live (no deck or decks), never in the locked shape, as G26 says. It does not consult `showcaseGroups`, since Upgrade is not a showcase tool.
5. **Row reading order.** R1b's grid keeps the visual (Try it above the pill, at the right) but orders the DOM name, pill, where, Try it, using grid placement (`row-start`/`col-start`) rather than source order.
6. **Phone scroll.** The Credits stop scrolls the strip to 14px under the top at 390, beside step 1's case, and the card docks under it at `phoneDock`.
7. **Copy.** All DRAFT strings go through `/copy-review`. Two items for it: the tour body hard-codes "your free credit each day", which the shipped `freeFirst` names per reader's allowance (`src/lib/copy/welcome-credits.ts:13`, copy-review 2026-10-21), and "uses a credit" sits over a row that costs 2. Plus the `what` line shared with #2899's landing row.

## Decisions inherited

- Hugh approved R1b on 2026-11-12, with his note: `Try it ›` sits above the cost pill.
- Locked: welcome credits stay 15, no bundle or recipe; the sheet keeps name, where and cost; it opens from Home's welcome strip and the /credits Welcome cell only. It never opens by itself.
- The first-run placement is a tour stop (`5 of 7 · Credits`, after Buying, before Your look), not the sheet and not a checklist list. Where lines and Try it stay in the sheet.
- The row and the stop's row follow the reader's `PRECON_UPGRADE_ENABLED`; the stop shows only while the strip draws.
- Upgrade costs a flat 2 credits a run (Hugh, 2026-11-10).
- About counts are Hugh's call at the next About batch (G28).
