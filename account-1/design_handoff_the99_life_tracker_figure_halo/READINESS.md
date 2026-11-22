# Readiness Review — Life tracker addendum: the ±N over any art

**Verdict:** 🟡 Yellow (buildable as drawn once Hugh approves the boards and #3191 lands)
**Audited:** 2026-11-22, against origin/main 14f9519 plus #3191 (`life-loss-red`, open)
**Related:** `ADDENDUM-life-press.md` (Nudge, #3160/#3155); #3191 (loss ink `--critical-fg`, its probe `probe-tracker-loss-ink.mjs` and the Clavileño residual it reports)
**Plan PR target:** TBD (one small tracker PR, after or on top of #3191)

## Summary

One class string on two spans. The whole change is `scratch-gen/proposal.diff` (a `HALO` constant and two class
concatenations in `panel.tsx`), which is what every board renders, so the boards and the diff agree by construction. It
uses existing tokens only, adds no keyframe, no state, no copy and no setting. Yellow because the boards are not yet
approved, because it depends on #3191's ink, and because #3191's new probe would measure the halo away (below).

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ The pending ±N and its fading copy, gains and losses alike. The life total, the press wash, the tick and nudge and
  the timings are named as unchanged.
- ✅ Phone, tablet and desktop: one component, one class string; the Seats board draws all three.

### 🎭 State coverage
- ✅ Pending loss and gain, the fade-in, the fade-out at the save, reduced motion, upright, sideways and upside-down
  seats, iPad landscape and portrait, phone, desktop, dark and light art, and the white plate bound.
- 🟡 Not drawn, stated in STATES: a run that crosses zero (the ink swaps, the halo stays), a partner seam under the
  figure, a panel with no art. All follow from the halo being part of the figure.

### 🔌 Data contract
- ✅ None. No data, no storage, no API.

### 🧱 Codebase fit
- ✅ Tokens: `--bg`, `--success`, `--critical-fg` exist in all six theme blocks of `globals.css`. `color-mix` is already
  used for the panel's own washes (`panel.tsx`).
- ✅ Tailwind only: `isolate` on the figure plus `before:` utilities (`absolute inset-y-[1px] -inset-x-[3px] -z-10
  rounded-full bg-[color:color-mix(...)] shadow-[0_0_10px_7px_color-mix(...)] pointer-events-none`). `isolate` keeps
  the `-z-10` pseudo-element behind the glyphs and above the art. The figure already sets `[text-shadow:none]`.
- 🟡 Depends on #3191: with `--danger` (L ≈ 0.18) no 60% halo reaches 3:1 over white. Build after #3191 merges, or
  fold the ink change into the same PR.
- 🟡 The halo feathers about 17 px left of the figure, so it overlaps the total's top-right corner. That darkens the
  ground under a light glyph, which only raises the total's contrast; it reads as part of the total's own shadow.

### ♿ Cross-cutting
- ✅ Contrast: 3:1 or better at every pixel behind the figure over any art (white plate bound 3.55:1, six themes, gain
  and loss, phone and tablet). Over real art the worst seat is 4.38:1 (was 2.45, Clavileño showcase); per seat on the Contrast board.
- ✅ Reduced motion: the halo has no motion of its own; `motion-safe:` on the figure already gates it.
- ✅ The halo is a pseudo-element: no text, nothing announced, no hit area (`pointer-events-none`; the figure is
  inside a `pointer-events-none` layer anyway).

### ⏰ Drift from reality
- 🟡 `scripts/probe-tracker-loss-ink.mjs` (#3191) hides the figure with `visibility:hidden` before it screenshots the
  pixels behind it. That hides the `::before` halo too, so it would measure the art without the halo and keep reporting
  the residual. Switch the hide to `color: transparent !important` on `[data-testid=life-pending]` (as
  `scratch-gen/measure.mjs` does) and assert worst pixel ≥ 3:1 on every seat, gain and loss.
- ✅ `probe-tracker-life-tap.mjs` asserts the figure's ink, which this does not change.

### 📝 Decision log
- ✅ Options A (text shadow), B (halo) and C (chip) are drawn on the same pixels with their measurements; B is drawn.
- ✅ Hugh's brief: existing tokens, keep the "faint wash only while pressed" feel, 3:1 against every pixel. Met.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: build on #3191's `--critical-fg` loss ink (merge it first, or ship both together).
- Item 2: put the halo on both `life-pending` and `life-pending-fade`, as one shared constant, so the fading copy keeps it.
- Item 3: update `probe-tracker-loss-ink.mjs` to hide glyphs with `color: transparent` and to assert ≥ 3:1 at the worst
  pixel; add a gain pass (press `half-plus`) so +N is held to the same bar.
- Item 4: a `panel.test.tsx` assertion that both spans carry the halo classes is enough; no new probe.

## Open questions

- For Hugh: the halo at 60% (drawn) or a touch darker for more margin over white (62% measured 3.76:1)? Eng builds 60%
  unless told otherwise.

## Decisions inherited

- The Nudge press (2026-11-22): wash only while pressed, ±N inks, fades, hold timings.
- #3191: loss ink `--critical-fg`, gain ink `--success`.
