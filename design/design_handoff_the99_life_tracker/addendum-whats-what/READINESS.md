# Readiness Review — Life tracker addendum: What's what

**Verdict:** 🟢 Green (approved by Hugh 2026-11-22)
**Audited:** 2026-11-22, against origin/main 2c188e2 (boards rendered from 4c987a8, tracker unchanged since)
**Related:** life tracker handoff and addenda (strip, panels, Menu M1, tablet sheet #3190); Discovery R1 (bubble, halo,
arrival rule) and R3 (tour spotlight)
**Plan PR target:** one tracker PR (guide component, Menu row, first-open flag, copy)

## Summary

A client-only overlay plus one Menu row. No schema, no server, no switch beyond the tracker's own. The guide places its
labels from the live controls' rects, as the boards' `scratch-gen/overlay.html` does.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Six calls in README; three decisions taken. Phone and tablet drawn; desktop is classed as a tablet.
- ✅ Out of scope: a ↻ for the far side, option B, labels on other seats' panels.

### 🎭 State coverage
- ✅ STATES.md lists every state; first open, Menu and mid-game are drawn on both devices (tablet mid-game, phone first).
- 🟡 Not drawn: other layouts (2, 3, 5, 6 seats, Ends, the upright tablet). Placement rule in call 6; the build should
  check each layout at 390×844 and 1180×820 for overlap.

### 🔌 Data contract
- ✅ None server-side.
- 🟡 **The seen flag must not use the `the99.tracker.` prefix.** `sweepGames` (`src/lib/tracker/storage.ts`) removes
  every key under that prefix that doesn't parse as a kept game, so a flag there would be swept and the guide would show
  again. Use its own key, e.g. `the99.trackerGuide.seen`, wrapped in try/catch like the rest of storage.ts.

### 🧱 Codebase fit
- ✅ The Menu row reuses `strip-menu-back`'s row markup; the Menu becomes a column with a 6px gap. Focus on open moves
  from Back to What's what.
- ✅ Targets: `strip-*` buttons, the foot panel's `half-minus`/`half-plus` glyphs, `end-turn`, `panel-sheet`,
  `panel-badges` (already test ids).
- 🟡 "Your panel" is the seat drawn at the screen's foot (cell 0), the one the guide faces, whoever sits there.
- 🟡 Labels are placed per layout family (tablet row above the strip; phone columns either side), not by a general
  collision solver. A small placement table per layout id is enough.
- 🟡 `scratch-gen/` is reference only; never import it.

### ♿ Cross-cutting
- ✅ Dialog semantics: `role="dialog"`, `aria-modal`, labelled by the header; the board is `inert` while it shows.
  The labels are a list in DOM order (strip, then your panel) for screen readers; leaders and halos are `aria-hidden`.
- ✅ Reduced motion: no fade.
- ✅ Contrast: label text on `--elevated`, as the R1 bubble.

## Decisions inherited

- Overlay, faces the foot, "What's what"; copy reviewed in the build.
