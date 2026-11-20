# Readiness Review — Public landing addendum A5b: a Precon Upgrade step in the demo

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** PR #2998; depends on PR #2994 (Upgrade fresh-start R2, `design_handoff_the99_precon_upgrade/addendum-fresh-start/`)
**Plan PR target:** TBD

## Summary

The step is buildable as drawn once Upgrade R2 has shipped. Every frame is the shipped demo dialog (`src/components/landing/demo/`) wrapped around R2's `ResultView` over the shipped `SuggestedChangesRun`. Phone (390, 320), tablet (768, 1024), desktop (1300) and all six themes are drawn, and every token the frames use exists in `src/app/globals.css`. Nothing here needs a Design round. Three things block the build, and none of them is a design gap. (1) **Order:** R2 is unbuilt. On this tree `ResultView` (`src/components/decks/precons/upgrade/result-view.tsx`) is still R1, which groups pairs by theme and takes `{ panel, run }` only. `linesOf`, `seedSet`, `press` and `beside` exist only in R2's scratch patch, so the `demo` prop diff cannot apply until R2 lands. (2) **The fixture needs a paid model run.** One Upgrade run on the fictional fixture (2 credits, plus Upgrade's model calls counted against the demo ledger's $10 hard cap). The handoff's route for it ("make the run once on staging, export with `demo:export`") does not match the tooling: both `demo:generate` and `demo:export` refuse staging (`assertScratchBranch`). The run must be a new `upgrade` step in `demo:generate --spend` on the fixture's scratch branch. (3) A small set of engineering decisions, listed below.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary stated: one new step 7 of 9. Nothing else in R4 or A1 to A4 changes except the count, eight → nine. Not drawn: the pick steps and the card details (shipped A2). Must-nots are listed.
- [🟡] One open copy question for Hugh: the uneven warning's "to apply" wording. It is wording, so it goes to /copy-review, not to Design.

### 🎭 State coverage

- [✅] Opened, line dropped, uneven, restored, phone side switch, grouping, card open, card details not loaded, and no run in the fixture are all in `STATES-precon-upgrade-step.md` and drawn at phone, tablet and desktop widths.
- [🟡] "No run in the fixture → the step is left out and the demo counts eight." Today `STEPS = c.steps.length` (`demo.tsx:48`) is a static copy array, so a conditional step needs a derived step list (bar, label, `?demo=step-N`, skipped range). Engineering work only.
- [🟡] Not stated: what happens when Upgrade's own switch is off. `landingClaims` returns `upgrade: null` when `preconUpgradeEnabled` is false (`src/lib/landing/claims.ts:22`), and the chip reads that claim. Follow the drawn "no run" state: no claim means the step is left out and the demo counts eight.

### 🔌 Data contract

- [🟡] `Projected.upgrade = { precon, panel, runId }` is new, and the handoff says so. It needs a `format` bump (2 → 3) in `src/lib/demo/projected.ts`, a `demo:export` reader using `readUpgrade` (`src/lib/precons/upgrade/deck-read.ts`), the wire decode for its Dates, and the name scan over the panel.
- [🟡] The tally's `bracket 2 → 3` is meant to come from R2's `seedSet`, which R2 marks "Scratch only: the server's set read, seeded for a static frame". The demo cannot make the server's set read. The build has to promote it to a real prop, seeded from the stored run's bracket (or from a set read `demo:export` stores). After the visitor's first pick change, the tally drops the bracket half, as drawn.
- [🟡] The step's card ids (every add, every cut, both commanders) need their own card-details chunk. That means `demo:export --merge=cardDetails` and the `cardStepsFor` / `stepCardIds` entries.
- [✅] Every drawn state maps to a real field: pairs, `unpicked`, the bracket, the commander pair (`leadOf`), and to buy / already yours (`panel.cards[*].owned`).

### 🧱 Codebase fit

- [✅] Reuses `DemoHead`, `DemoCardHost`, the demo providers with inert actions, `SuggestedChangesRun` (already drawn in step 6 with `groupingInMemory`), and `credits.tsx` with `UPGRADE_UNITS`. No new token or component, and no typed 2.
- [🟡] `ResultView` becomes reachable from the public landing surface. R2's version must stay clean under `pnpm check:public-reads`: no session read, per-user module or server action reached by value. Step 6's `isLineItem` workaround (`demo-step-analysis.tsx:21`) shows the trap. Run the guard on the build PR.

### ♿ Cross-cutting

- [✅] Focus and the ring follow steps 1, 3 and 6. Card details open as a modal from 768 and as a sheet below that, as shipped. The `aria-live` step label already reads `Step N of M`.
- [🟡] Performance: the panel adds the step's swaps (28 lines plus card data) to the committed fixture, and its card details go in a lazily fetched chunk like the other steps, never in the first payload.

### ⏰ Drift from reality

- [🟡] Drawn over R2's scratch patch (`fspatch.diff`), which is not on main. `result-view.tsx` on this tree is R1. Re-check `scratch-gen/demo-prop.diff` against R2 as merged, before building.
- [✅] Every other name exists as written: `StepBody`, `cardStepsOf`, `ringTarget` / `ringPlace` / `stepCardIds`, `DemoHead`, `DemoCardHost`, `UPGRADE_UNITS`, `readUpgrade`, `UpgradePanel`, `demo:export`. The copy "eight" lives at `landing.ts:130`, `:133`, `:176`.
- [🟡] The fixture route is drifted, as covered in the summary: not staging, use `demo:generate` on the scratch branch.

### 📝 Decision log

- [✅] Seven calls recorded. R1's retired calls (`limit`, Show all, no foot) are named. Ordering G4 is explicit.

## Eng-side clarifications (Yellow only)

- **C1 — order:** build only after the Upgrade fresh-start R2 build (PR #2994's handoff) has merged. Then re-check the `demo` prop diff against R2's real `ResultView` and `SuggestedChangesRun`.
- **C2 — fixture:** add an `upgrade` step to `demo:generate`: Prismari Artistry, Muddle, bracket 3, Spells, run `--spend` on the fixture's scratch branch, never staging. Then extend `demo:export` (format 3, `readUpgrade`, name scan, `--run` lookup by the summary's row id). The fixture's credit precheck (currently "at least 6") has to cover the extra 2.
- **C3 — conditional step:** derive the step list from the fixture and the claims. No run, or `claims.upgrade === null`, leaves the step out and counts eight, per the drawn no-run state.
- **C4 — bracket seed:** promote R2's scratch `seedSet` into a real input the demo feeds from the stored run.
- **C5 — renumbering (G3):** cover `StepBody`, `cardStepsOf` (Shopping moves from index 7 to 8), rings, the card-details chunk, the copy's "eight" (three places), `?demo=step-N`, and the tests that count eight.
- **C6 — public surface:** `pnpm check:public-reads` stays clean with `ResultView` reachable from the landing page.

## Flags (product calls, not gaps)

- **Model call and spend:** yes. One Upgrade run (its model calls) on the scratch fixture through `demo:generate --spend`, under the landing-demo ledger's $10 hard cap, plus 2 fixture credits. It is a one-time cost, and visitors never trigger it.
- **Migration:** none. **New switch:** none (the step follows the demo's and Upgrade's existing switches). **Email to real people:** none.

## Decisions inherited

- Step 7 of 9, between Suggested changes and Get it to 99. The precon is Prismari Artistry (Muddle, 2 → 3, Spells).
- The step is R2's `ResultView` with `demo`: no You asked, no Apply place, no apply line, no Start the deck, no Try another strategy, no Pick on the Commander pair.
- Picks work in local state and save nothing. Every swap shows, with no trim. The chip is built from `UPGRADE_UNITS`. The ring is "Select a card" on the first addition's name.

## Design's own read (kept)

# READINESS · addendum A5b, a Precon Upgrade step in the landing demo

**Verdict: Yellow** (A5b, before Hugh's review). One gap needs a step outside code (the fixture run) and the step builds after Upgrade R2.

| Gap | What | Owner |
|---|---|---|
| G1 | One real upgrade on the fixture account on staging (Prismari Artistry, Muddle, bracket 3, Spells; 2 credits), exported into `Projected.upgrade` | Engineering |
| G2 | `demo` prop on `SuggestedChangesRun` (no You asked, no Apply place, no apply line) and passed through R2's `ResultView` | Engineering, small |
| G3 | Steps after 6 renumber: `StepBody`, `cardStepsOf`, rings, card-details chunk, tests counting eight | Engineering, small |
| G4 | Ships after the Upgrade fresh-start R2 build (`design_handoff_the99_precon_upgrade/addendum-fresh-start/`) | Engineering, order |

Retired from R1: the `ResultView` `limit` prop. Copy: drafts in README, owed to /copy-review; one open copy question for Hugh (the uneven warning). No new token, component or flag (the demo already ships behind its own). Mobile and desktop ship in one PR.
