# Readiness Review — Life tracker strip press parity (addendum)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21
**Related ticket(s):** PR #3149 (branch `design/life-tracker-strip-press`); supersedes the "strip press" section of addendum R2 (#3131, built in #3139); audited against origin/main bd67b89
**Plan PR target:** TBD (single small build PR, no plan doc needed beyond the decisions below)

## Summary

A one-rule change to one constant. The strip button press loses its `:active` accent fill and its 200 ms scale, and gains `scale(.92)` over 80 ms with no colour change. Every other state in the addendum's table matches what main already draws, and the addendum's "shipped on main" column is accurate. Nothing needs Design. Three eng-side clarifications (duration split, reduced-motion consequence, probe and test rewrite) are recorded below.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Strip only; off-strip, day/night spin and Menu contents named unchanged. It states what it replaces (R2 "strip press").
- [🟡] Dated 2026-11-22 while today is 11-21 (same quirk as the R2 ruling). Cosmetic.

### 🎭 State coverage
- [✅] Press, picking, dice open, holder, nobody, disabled Undo are all in the table, matching `aria-pressed` / `aria-expanded` / `holder.held` / `disabled` in spine.tsx.
- [🟡] Reduced motion: "no scale" is the whole spec. R2 and the shipped comment say reduced motion "keeps the fill and drops the push", so after this change a press under reduced motion draws nothing at all (the held fill and ring still draw from state). The addendum states it and the demo page does the same, so it is a decision, not a gap.
- [✅] Phone and desktop: one component and one class string for every strip button, so parity is automatic.

### 🔌 Data contract
- [✅] No data or API touch.

### 🧱 Codebase fit
- [✅] The `sb` constant in `src/components/tracker/spine.tsx` (the const near line 259) is the only place. Delete `enabled:active:bg-[color:var(--accent)] enabled:active:text-[color:var(--bg)] enabled:active:shadow-none`. Keep `motion-safe:enabled:active:[transform:scale(.92)]`, `aria-expanded:` / `aria-pressed:` fills, `aria-pressed:shadow-none`, and `enabled:` so disabled Undo does not press.
- [🟡] Timing is split: transform 80 ms, background, color and box-shadow 200 ms. Tailwind's `transition-[...]` takes the single default `--motion-quick` (200 ms), so the build needs a per-property duration, e.g. `[transition-duration:80ms,200ms,200ms,200ms]` in the same order as the property list. The 80 ms is a literal with no token. The nearby end-turn pop buttons already use `motion-safe:duration-75`, so a literal is the local precedent.
- [✅] The held fill and the 1.5 px ring on a held holder are untouched. Removing the `:active` variants also removes the ordering hazard the shipped comment describes.
- [✅] The other presses in spine.tsx (popover rows `active:scale-[.96]` / `[.98]`, `duration-75`) are not `.sb` and are out of scope.

### ♿ Cross-cutting
- [🟡] Press feedback now exists only as motion, so a reduced-motion reader gets none on a plain press (see State coverage). Focus-visible and the state-driven fills still show. No telemetry.

### ⏰ Drift from reality
- [✅] bd67b89 is the latest commit touching spine.tsx. Its description of shipped press (fill, ring off, scale .92, 200 ms) matches the code exactly.
- [🟡] Stale after the build: the `sb` doc comment, `design/.../addendum-r2/README.md` (Design-owned; this addendum supersedes it), `docs/probes.md` (`probe:tracker-spine` entry), and `READINESS_parity-motion.md` line 81 (historical, leave).

### 📝 Decision log
- [✅] Change table marks keep vs change per state, and says it replaces R2's press section. `press-test/index.html` is a reference page only; never import or ship it (`design/` rule).

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1 (duration split): the build gives transform 80 ms and colour properties 200 ms via an arbitrary `transition-duration` list matching `transition-[transform,background-color,color,box-shadow]`. Release also eases back over 80 ms, as in the demo.
- Item 2 (reduced motion): follow the addendum, `motion-safe:` keeps gating the scale, with no press feedback under reduced motion. State changes (held fill, ring) still draw. The doc comment is rewritten to say so.
- Item 3 (tests and probe): `src/components/tracker/spine.test.tsx` "presses every strip button only while enabled" (lines 63-72) asserts `enabled:active:bg-[color:var(--accent)]`. Invert it to assert the class is absent and `motion-safe:enabled:active:[transform:scale(.92)]` stays, plus an assertion on the 80 ms transform duration. `scripts/probe-tracker-spine.mjs` check 4 (lines 2, 118-144) asserts held = accent fill for every button, including a plain press of day and undo. Rewrite it: a held press scales under 1 over 80 ms with the background unchanged. For dice, Menu and monarch the fill still shows after the press opens the popover or picking mode, so assert it from `aria-expanded` / `aria-pressed`, not from `:active`. Then update the `docs/probes.md` `probe:tracker-spine` entry.
- Item 4: the `sb` comment block (spine.tsx 252-258) is rewritten to the new rule.

## Decisions inherited

- Held fill while picking Monarch or Initiative, and while the dice menu or Menu is open (`aria-pressed` / `aria-expanded`), stays.
- A held holder keeps the accent ring and accent ink; nobody holding (or day/night off) is `--fg-faint`; disabled Undo is opacity .35 with no press.
- Day/night spin (320 ms `dn-out` / `dn-in`) and Menu contents are untouched.
- Hugh's 11-22 ruling: the accent flash is the "blink" and goes.

## Decisions taken (orchestrator, 2026-11-22)

- (a) Reduced motion: accepted as written. A plain press draws nothing under reduced motion; the held fill and the ring still draw from state.
- (b) Timing: an arbitrary `[transition-duration:80ms,200ms,200ms,200ms]` in the transition's property order. No new token.
