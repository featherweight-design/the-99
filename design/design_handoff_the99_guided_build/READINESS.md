# Readiness Review — Guided build (R1)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold read against the tree rebased on origin/main)
**Related ticket(s):** PR #3063 (design/guided-build)
**Plan PR target:** TBD (`docs/superpowers/plans/`)

## Summary

R1 is drawn over shipped screens (CreatePreFilled, CommanderDetail, Upgrade's chrome) and is buildable as drawn. It replaces the earlier self-assessed note; Hugh's LGTM and the copy-review gate stand. The credit rules match what ships: 2 credits is `UPGRADE_UNITS`, refunds follow `upgradeChargeFor`, and the shortfall copy matches `precon-upgrade.ts` `shortOff`. No Design gap needs a round-trip. The engine, not the UI, is the weight: Upgrade is keyed to a precon box (`precon_upgrades`, `decks.builtFromUpgradeId`, `deck-gate`), so G2, G3 and G6 are a new per-deck run over the same engine. The plan PR records the clarifications below.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Locked brief, Design's calls, gaps G1 to G9 and three closed open questions are stated.
- [🟡] README says every route lands on the new-deck screen, including Decks › New deck. In code `/decks/new` with no commander renders `CreatePicker`, which calls `createDeck` itself (and has an import mode). That surface is not drawn.

### 🎭 State coverage
- [✅] Choice, short credits, payments off, wait, ready, short, failed, Help me choose and the leave-and-return tile are drawn.
- [🟡] Phone only: N4, R4, H2 to H5. Desktop only: N5d. Desktop follows Upgrade's 720 dialog.
- [🟡] Not drawn: a commander with zero strategies backed by `MIN_BACKING`; sharpening done but the Overview write fails; the guided switch off.

### 🔌 Data contract
- [🟡] G1 to G9 name the work. Not named: a `ModelFeature` / `FEATURE_CALLS` entry for the guided run (`allowance-rule.ts` lists `precon_upgrade` only) and its worst-case pricing with the Overview inside the 2 credits.
- [🟡] Overview-once-per-run is `precon_upgrades.overview_at` today; guided needs the claim on the per-deck run.
- [✅] Credits: "out of credits" stays decided in `allowance-rule.ts`; paid sources stay `PAID_SOURCES` (plan, pack); the free daily credit covers 1 so cannot fund a 2-credit run, as Upgrade.

### 🧱 Codebase fit
- [✅] Reuses Upgrade chrome, `SynopsisSections`, `MIN_BACKING`/`MAX_STRATEGIES`, `kept-picks`, `creditsCopy`, `helpMeChooseCopy`.
- [✅] Copy is in a strings file, DRAFT until /copy-review.
- [🟡] "The fill follows this" (copy, Cards step) vs "deck created at confirm with the free fill" (call 7): the plan fixes which fill the Buy modes use.

### ♿ Cross-cutting
- [🟡] No a11y notes for the radio group, disabled Guided row (reason must be programmatically attached), or the wait's live status. Follow Upgrade's wait and the shipped radio patterns.
- [🟡] Cost: one extra model call per run (Overview) inside the 2 credits; the plan reads the measurement.

### ⏰ Drift from reality
- [✅] Named components and files exist. Code names in README (`planFill`, `createDeck`, `writeUpgradedOverviewFor`, `MIN_BACKING`) resolve.

### 📝 Decision log
- [✅] Locked vs Design's calls vs open questions are marked; LGTM closes the open ones.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. Decks › New deck picker: stays as shipped (free fill, import untouched) since Hugh's ruling covers For you and Discover; correct the README line. If Hugh wants the choice there, that is a separate ask.
2. Switch: guided rides `PRECON_UPGRADE_ENABLED` and `requestFlags` (no new switch without Hugh); switch off draws the shipped new-deck screen with no choice group.
3. Zero backed strategies: skip the Strategy step and run without a theme, or offer free build only; decide from `detect.ts` and record it.
4. Overview write fails after a good sharpen: as Upgrade, no refund, Ready draws without the Overview and the deck's Write an Overview press remains.
5. Add a `ModelFeature` and `FEATURE_CALLS` entry for the guided run; the Overview write is a 0-unit synopsis call as `writeUpgradedOverviewFor`.
6. Buy-mode fill: the free fill stays owned-only at confirm; the buy pool applies to the sharpening (G4).
7. Phone-only and desktop-only frames: derive the missing viewport from the drawn twin (Upgrade 720 dialog).
8. A11y: radio group, `aria-describedby` on the disabled row, live region on the wait, as Upgrade.

## Decisions inherited

- Guided costs 2 credits, refunded whole on failed or short (under 12); Upgrade's engine sharpens 12 to 18 and writes the whole Overview (Hugh, 2026-11-20).
- Free pre-marked; Ready shows four facts plus the whole Overview; no cards-to-avoid step.
- Copy review before ship; the P-Picks board supersedes call 4's first frames.
- Help me choose stays the way to find a commander; its answers carry in visibly.
