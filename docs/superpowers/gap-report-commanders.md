# Design Gap Report — Commanders (#7)

**Date:** 2026-07-19
**Property table:** `docs/superpowers/design-tables/commanders.md`
**Verdict: 0 gaps remaining** (Agent 2 verify → fix wave → Agent 3 confirm → residual fix → confirmed)

## Process

- Agent 2 (dual-pass: visual properties + state reachability across all 10 states) found **19 visual gaps + 2 state gaps**.
- One fix wave (`fedd089`) addressed all fixable items; Agent 3 confirm found **1 residual** (lightbox mana pip text colors), fixed in `7e50a77`.

## Gaps found and fixed

1. Color filter widget rebuilt: circular pips (14/16px, opacity 0.35 inactive, gold ring active), "COLORS" label, pip-row wrapper `#181410`.
2. Active-filter chips added (both breakpoints): color dot + dismiss ✕.
3. Filter clear link color → `#C9A24B`.
4. Desktop filter container: sticky top 0, `#14110E`, `18px 34px 14px`, border-bottom `#2A241D`, z-index 2.
5. "Includes ▾" affordance added (styled-only).
6. "Order: Fit ↓ · fixed" label added.
7. Page header added (`page-header.tsx`): Cinzel "Commanders" 22/30px, mono subtitle, mobile border-bottom + account avatar.
8. "Showing N of M" count moved into the filter row (right-aligned).
9. `commanderGradient()` added: `linear-gradient(130deg, mid, light 34%, light 55%, mid 82%, dark)` — Collection's `identityGradient` (125deg/4-stop) locked by its own table, left unchanged.
10. Empty-state XCIX seal: 96/110px circle, `#C9A24B`.
11. Empty-state container padding `24px 30px` / `60px 40px`, min-height 520px desktop.
12–14. Empty-state heading/body/button values corrected per table.
15. Mana pip text colors per table (B `#0E0C10`, R `#1a0b08`, G `#0c1608`) in detail + lightbox.
16. Degraded receipts-hidden note now shows whenever `fitSynergy === null` (global scope included).

## State reachability

All 10 states REACHABLE: first-run, populated, filtered, degraded-global, degraded-per-commander, empty-no-candidates, empty-filtered-to-zero, detail-normal, **detail-card-modal**, detail-build-entry.

`detail-card-modal` was `detail-lightbox` until 2026-09-12. Same state, same count — the handoff's
full-card lightbox was replaced by the shared card modal, and the row is renamed rather than split so
this inventory keeps describing what a reader can actually reach.

## Accepted deviations (documented, not gaps)

- **Breakpoint:** table says 768px; implementation uses Tailwind `sm:` (640px), consistent with shipped #5/#6 surfaces.
- ~~**Lightbox overlay `position: fixed`:** table's `absolute` assumed a root mount point; the component mounts inside the 236px art header, where `absolute` clips the overlay. `fixed` covers the viewport as designed.~~ **Historical as of 2026-09-12** — `CommanderLightbox` no longer exists. The shared card modal that replaced it draws its own `fixed inset-0` backdrop and mounts through `CardDetailProvider`, so neither the deviation nor the clipping it worked around survives. See `design/design_handoff_the99_amendments/PARITY-lightbox-to-modal.md`.
- **P/T line omitted** on detail oracle panel: schema lacks power/toughness — tracked as issue #20.
- **Compare button** styled-only stub (no compare surface in v1).
- **W/U mana pip text colors** not specified in the table — generic `#C6B79A` fallback used.
