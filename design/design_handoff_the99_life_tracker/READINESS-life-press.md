# Readiness Review — Life tracker life press = Nudge (addendum)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21
**Related ticket(s):** PR #3160 (branch `design/life-tracker-life-press`); replaces addendum R2's cue A (held half, built in #3134); press build merged in #3155; strip press in ADDENDUM-press-parity.md (READINESS-press-parity.md). Audited against origin/main.
**Plan PR target:** TBD (one build PR, no plan doc beyond the decisions below)

## Summary

The addendum is complete and buildable from theme tokens alone. Every "on main now" cell matches `src/components/tracker/panel.tsx`. Nothing needs Design. The build is more than a class swap: the half wash moves from the held `lit` state to the live pointer-down state, the number ticks and nudges on every step (today it ticks once at the commit, via `key={state.life}`), and the pending ±N needs a fade-in, a coloured ink and a fade-out that outlives the commit. Five eng-side clarifications are recorded, plus one contrast question worth Hugh's or Design's glance.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Life halves only; the strip press, the panel (no tint or pulse) and R2's removal of it are named as standing. It says what it replaces (R2 cue A).
- [🟡] Dated 2026-11-22 while today is 11-21 (same quirk as the other addenda). Cosmetic.

### 🎭 State coverage
- [✅] Every state is in the table: pressed, each tap, each hold step, ±N pending, ±N at the save, a tap during the fade, reduced motion.
- [🟡] Keyboard Enter/Space calls `down` then `up` in one task (panel.tsx ~408-415), so a pointer-down wash would never draw. The demo page does the same (keydown adds a step, no wash). Follow it: keyboard gets the nudge and ±N, no wash; `focus-visible` already tints the half at 12%.
- [🟡] Out face, disabled (`disabled || out`) and a slid-off press (`cancel`) are not stated, but the wash is "only while pressed", so each shows no wash. A slide-off ends the wash (pointerleave); there is no hand-back of the light to the other half any more.
- [✅] Phone and desktop: one component and one class string for every half on every seat and arrangement; parity is automatic. No data-driven states.

### 🔌 Data contract
- [✅] No data or API touch. The ±N is local state; the commit and its COMMIT_MS (2000) are unchanged.

### 🧱 Codebase fit
- [✅] Tokens `--accent`, `--success`, `--danger`, `--fg-muted` exist in every theme block of `src/app/globals.css`.
- [🟡] Wash: `half-fill` (panel.tsx 425-429) goes from 18% to 10% and from `lit === sign` to "pointer is down on this half" (the `pressed` ref, today not state). 80 ms in, 200 ms out: the `opacity-0` side carries `duration-200`, the pressed side `duration-[80ms]`. The glyph class (line 421) drops `pressed || lit === sign` and stays `--fg-muted`; the pending-based `pressed` const (line 394) loses its meaning. Keep `data-pressed` but drive it from the pointer-down state, since `probe-tracker-panel.mjs` 123 reads it.
- [🟡] Number tick and nudge: the number span is `key={state.life}` (line 376), so it replays `life-tick` only at the commit and remounts its ±N child. Keying on `state.life + pending` would remount the ±N child every tap and restart its fade-in. Drive tick and nudge from a step counter plus direction on the number's text only, with the ±N outside the keyed element, so a commit (which changes nothing displayed) replays nothing ("nothing else moves at the save"). New keyframes beside `life-tick` (globals.css 754): nudge up/down (translateY -5px / +5px to none, 180 ms ease-out), ±N fade-in (150 ms, 4 px rise) and fade-out (400 ms, 6 px up), all `motion-safe:`. The nudge direction is the step's, not the total's.
- [🟡] ±N outliving the commit: `pending !== 0 ? <span>` unmounts at the save (line 382), so the fade-out needs a held copy of the last ±N (text and sign) rendered with the out animation for about 400 ms, or until a new step replaces it at once. Keep `data-testid="life-pending"` on the live one only.
- [✅] Hold timing: `HOLD_MS` 450 to 480 and `REPEAT_MS` 280 to 380 (panel.tsx 24-25), as the addendum's table states.
- [✅] Ink: `text-[color:var(--success)]` for a gain, `text-[color:var(--danger)]` for a loss, replacing `--accent-text` (line 384).

### ♿ Cross-cutting
- [🟡] Contrast: `--danger` (#C6533F) as 18px medium mono on the dark grounds is about 4:1 by luminance, under 4.5:1 for text that size, and globals.css 106 already records `--danger` as "too dark as 10px text". The sign and the number carry the meaning, so it is not colour-only, and Design compared all six themes. Flag, do not block (see Open questions).
- [✅] Reduced motion is specified (no nudge, tick or ±N fades; ±N shows and clears; wash stays); `motion-safe:` gating gives it.
- [🟡] The `aria-live` region wraps the number and the ±N; the held fading copy must be `aria-hidden` so it is not announced twice. No telemetry.

### ⏰ Drift from reality
- [✅] The "on main now" column is accurate: 18% fill held until the save with a 120 ms fade, accent glyph, one tick at the save, accent ±N with no motion that vanishes, 450/280 ms hold.
- [🟡] Stale after the build: the cue A comments (panel.tsx 35, 391-393); `scripts/probe-tracker-life-tap.mjs` lines 140-171 (assert the 18% hold, first-sample pressed colour, hold through the window, slid-off hand-back: all now false) and its `docs/probes.md` entry (line 2930); `scripts/probe-tracker-panel.mjs` 121-123 ("pressed while pending"); any `panel.test.tsx` assertion on the old hold. `addendum-r2/README.md` is Design-owned and superseded; `press-test/life.html` is a reference page, never imported or shipped.

### 📝 Decision log
- [✅] The pick (option 5, Nudge), its date and the rejected alternative (6, nudge plus ripple) are recorded; the ruling is locked. Each cell says what changes versus main.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1 (wash source): the wash follows the live pointer-down on that half (state set in `down`, cleared in `up`, `cancel` and when a hold ends), not `lit` or `pending`. Keyboard presses draw no wash (the demo does the same).
- Item 2 (number): tick and nudge on every step including each hold repeat, driven by a step counter, not `state.life`; the commit replays nothing.
- Item 3 (±N): fade-in on the first step of a run only (later steps change the text in place); a held, `aria-hidden` copy plays the 400 ms fade-out at the save and is replaced at once by a new step.
- Item 4 (hold): 480 ms then every 380 ms.
- Item 5 (tests and probes): rewrite `probe-tracker-life-tap.mjs` (wash only while down, 10% alpha, gone within 250 ms of release, nothing held at the save, no panel tint), the `panel.test.tsx` assertions and `probe-tracker-panel.mjs` 123; update the probes.md entry. A reduced-motion run asserts the wash still draws and nothing animates.

## Open questions

- For Hugh or Design (non-blocking): `--danger` ±N at 18px is about 4:1 on the dark grounds. Accept as drawn, or give the loss ±N a lighter ink (as `--critical-fg` does for the chip)? Eng builds `--danger` as drawn unless told otherwise.

## Decisions inherited

- Hugh's 2026-11-22 pick, option 5 Nudge: 10% accent wash only while pressed; glyph stays `--fg-muted`; no panel tint or pulse; reduced motion keeps the wash and drops every motion.
- ±N ink `--success` (gain) and `--danger` (loss); nothing held through the 2 s window; hold 480 ms then 380 ms.
- The strip press (ADDENDUM-press-parity.md) is separate and unchanged.
