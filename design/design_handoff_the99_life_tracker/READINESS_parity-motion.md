# Readiness Review: Life tracker addendum R2, parity and motion

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21 (against origin/main 4527f8334; Design PR #3131, branch design/life-tracker-parity-motion, commit 10a70fb8e)
**Related ticket(s):** #3131 (Design PR); builds on #3115 (strip Menu), ADDENDUM-undrawn-tablet-menu (tablet 2/3, upright), ADDENDUM-undo-ending
**Plan PR target:** TBD (a plan under docs/superpowers/plans/, after Hugh settles Item 1 below)
**Intended home:** design/design_handoff_the99_life_tracker/READINESS_parity-motion.md (sits beside READINESS.md, READINESS_undo-ending.md, READINESS_undrawn-tablet-menu.md; commit in a doc PR before the plan PR)

## Summary

All four items are answered and every answer can be built on this codebase. The rects are consistent (no overlaps, gaps 6 px phone / 10 px tablet, seats in clockwise order, `lifeSize` falls to 86 / 86 / 140 / 150 as claimed), the tokens exist (`--motion-quick/-duration/-ease/-ease-out` in globals.css:597-612), and no data change is needed (game state is local; layout id is the only stored key). Nothing needs a Design round. What blocks a clean plan is not the addendum's drawing but a collision with lane 58's three in-flight PRs (B life tap, C parity, D spine): each contradicts the addendum on a specific value. Those need one ruling and a retarget of the lane, not new boards. Two eng-side holes (the retired `phone-5` alias moves seats mid-game; the reduced-motion render test needs JS, not CSS) are resolved below.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Four items, a table of boards to items, seven numbered decisions, rules for engineering and tests. Hugh's "every arrangement on every device" is honored (P0 matrix).
- 🟡 README header says "APPROVED by Hugh 2026-11-21 (gain/loss: A)" but the section is titled "Decisions (for Hugh)" and decisions 1-4, 6, 7 read as recommendations. Treated as approved (status line says every board is approved); plan should record that.
- 🟡 The base README still says phone "4 (around), 5, 6; tablet 4 (2+2)" (README.md:97) and still lists the "Gain/loss pulse 0.6 s" motion row (README.md:104). The addendum supersedes both but does not say to amend them. Plan records the addendum as the winner.

### 🎭 State coverage
- ✅ Phone, tablet, tablet upright drawn for every arrangement and for the cue (G1/G2); phone-6 Ends drawn "for the first time" (R1-Phone6-Ends). Active-seat End turn, icon-only End turn, monarch holder and the strip are all in frame.
- 🟡 Upright versions of the new layouts exist only as pictures (P0, R2-Tablet4Around-Upright, G1/G2-Upright). The addendum gives no upright rects; the rule is the prior addendum's "landscape twin turned a quarter" (ADDENDUM-undrawn-tablet-menu.md:31). Follow it; same for phone 5/6 on a tablet.
- 🟡 Setup's seat map (face-drag map, F02/F02b/F02c) is not drawn for phone 5 Three-and-two, 5 End, 6 Three-and-three or tablet 4 One-on-each-side. It is derived from the cells (seat-map.tsx `panels()` folds the spine, snaps to twelfths; BOARD_TOPS only special-cases phone-4-sides), and tablet-5-end / tablet-6-ends set the precedent of an undrawn map. Derive it; check the 273 px / 315 px three-per-side blocks against BLOCK_H 85.
- ✅ Reduced motion specified for both motions (K1, K2 with a switch). Out face, signed-out: not touched by this round.

### 🔌 Data contract
- ✅ No schema or API change. Layout id lives in `game.config.layout` (play-surface.tsx:103 `layoutById`).
- 🟡 **Retired `phone-5` alias moves seats.** README:~107 says "New cells get new ids so a game saved mid-play never has its seats moved", then aliases the retired `phone-5` to `phone-5-end`. Old `phone-5` cells (layouts.ts:48: ends top and bottom, two left, one tall right) are not `phone-5-end` cells: the top-end seat would jump to a side. `fits` (play-surface.tsx:104) only checks cell count, so it would not discard the game. Eng fix: keep `phone-5` resolvable by id with its current cells, hidden from `layoutsFor` (a `hidden` flag or a separate map), so a saved game plays out unchanged. Then Rematch (setup.tsx:71 falls to `layouts[0]` when the id is not listed) lands on Three and two; acceptable.
- 🟡 Tests row requires `layoutsFor` to match phone/tablet "at every n from 2 to 6". Main has no tablet-2/3 layouts (layouts.test.ts:42 exempts them; play-surface.tsx:249 falls back to the phone's). They are specified by the earlier tablet addendum (T1-T3), not this one. Dependency: that addendum's layouts must land first or in the same plan; otherwise the test cannot pass.

### 🧱 Codebase fit
- ✅ Real files named correctly: `src/lib/tracker/layouts.ts` (not src/components/tracker/), `panel.tsx`, `spine.tsx`, `globals.css`. `lifeSize` unchanged is correct. Foot-less name-row anatomy for tablet-4-around matches tablet-5-end / tablet-6-ends (layouts.ts:52,54).
- ✅ Tokens, `--sb`, `motion-safe:` convention all exist. `life-pulse` keyframes (globals.css:763) and the pulse span (panel.tsx:268, state at :167-172) are exactly what the addendum says to delete.
- 🟡 Strip press: README says a disabled Undo is excluded via `disabled:active:` resets but the snippet omits them; use `enabled:active:` (what D already does).
- 🟡 Reduced-motion render test ("one icon under reduced motion, two otherwise") cannot be a CSS-only change; jsdom does not evaluate `motion-reduce:`. Use `window.matchMedia("(prefers-reduced-motion: reduce)")` (precedent: card-detail-provider.tsx:924, arrivals-banner.tsx:157) or assert the `motion-reduce:hidden` class on the outgoing icon.
- 🟡 Labels live in layouts.ts, not src/lib/copy; copy goes through `/copy-review` as the addendum says.

### ♿ Cross-cutting
- ✅ Icon-only End turn keeps `aria-label="End turn"` (the shipped `data-testid="end-turn"` and copy.endTurn stay). Cue A keeps sign and side as the non-color cue (a reason it rejects B).
- 🟡 The 240 px threshold is stated as row length of the panel's own upright frame. For rot ±90 cells that is the cell's long side (155x217 -> 217). Compute from `cell`, not from the rotated box. Only phone-6 Ends (217) falls under it; every other new row is 273 or more.
- ✅ Perf: one transition list and one keyed icon; nothing measurable.

### ⏰ Drift from reality
- ✅ Everything named exists as named on main. #3115's Menu is in the strip (spine.tsx:148).
- 🟠-adjacent, but resolved below as a ruling, not Design work: three in-flight lane-58 branches touch the same lines (see next section).

### 📝 Decision log
- ✅ Seven numbered decisions with the reason for each, including the rejected options (B tint, bounce, phone 5 Around).
- 🟡 Lock status of B (tint) is "drawn, not chosen"; fine as inert alternate.

## Collisions with lane 58's in-flight PRs (local branches, not on origin/main)

| PR / branch | What it does | Addendum says | Resolution |
|---|---|---|---|
| B `tracker-life-tap` (51a369b2b, panel.tsx, globals.css) | Replaces `life-pulse` with `half-fade`: an accent ground lit at once, fading **linearly over COMMIT_MS (2 s) to nothing**; removes the 120 ms transition; reduced motion holds the ground; comment cites "Hugh ruling 11-22" | Cue A: half held at 18% for the whole 2 s window, then **120 ms fade at commit**; keep `transition-[background-color] duration-[120ms]`; G1/G2 draw it static | Contradiction on what the half does during the window. Needs one ruling from Hugh (or orchestrator relaying it): hold-then-fade-at-commit (addendum) vs fade-over-window (B). Not a Design drawing job; if B is the ruling, K1 section 3 and G1's caption should be amended. B's date (11-22) is after today (11-21), so confirm which ruling is later. |
| C `tracker-layout-parity` (de5596765, layouts.ts) | Adds `tablet-4-around` with the same rects as the addendum, but renames the **tablet** 4 labels to the phone's ("Two long sides, two players each" / "One player on each side") | Decision 2: one name per arrangement, the **tablet's** names ("Two and two" / "One on each side") on both devices | Direct contradiction. Rects match (good). Retarget C's labels to the addendum's before merge; C covers neither phone 5 nor 6 and keeps phone-5 "Around". |
| D `tracker-spine` (38a299fa6, "WIP spine", spine.tsx, globals.css) | Day/night: incoming icon only, `day-turn` -120deg scale .5, **.45 s with overshoot** `cubic-bezier(.3,1.3,.5,1)`; strip press transform .08 s, bg/color .2 s | Decision 7: out +90 / in -90, both icons, **320 ms `--motion-ease-out`, no overshoot**; Decision 6: all of transform/bg/color over `--motion-quick` (200 ms) | Direct contradiction (D implements the prototype the addendum rejected as a "wobble"). Press fill and scale .92 agree. D is WIP; retarget it to the addendum. |

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow)

1. Keep `phone-5` (old Around cells) resolvable by id but unlisted, so a saved game never moves seats; alias nothing. (Data contract.)
2. Add the tablet-2/3 layouts from the earlier addendum before, or with, the parity test; otherwise scope the test to counts that exist.
3. Reduced-motion check for the day/night icon via `matchMedia` or a `motion-reduce:hidden` class on the outgoing icon; decide the test accordingly.
4. End turn goes icon-only when the panel's row (the cell's long side) is under 240 px.
5. Strip press uses `enabled:active:` so the disabled Undo does not press.
6. Upright cells for new layouts follow the earlier addendum's quarter-turn rule; setup's seat map derives from cells, as it does for tablet-5-end.
7. Fold the addendum into the base handoff's stale lines (README.md:97, :104) in the same doc PR, or note in the plan that it wins.
8. Tell lane 58 to retarget B, C, D as per the table; ask for Hugh's ruling on B vs Cue A first.
9. Copy (labels only) goes through `/copy-review`: "labelled" appears twice in README.md (lines 46, 137) and "Colour" in K1-Motion.dc.html and scratch-gen/gen_r2.py:304; US spelling is "labeled" and "Color". No em dashes in any addendum file (README, 17 boards, generator).

## Decisions inherited

- Hugh: every arrangement is offered on every device; first listed is the default on both (4 Two and two, 5 Three and two, 6 Three and three).
- Hugh 2026-11-21: gain/loss cue is A (no pulse, nothing new); B is drawn only as an alternate.
- Phone 5 Around is dropped; phone 6 Ends keeps id `phone-6` and its cells.
- Tablet 4 One on each side: ends 250x800 at x10 and x920, pair 640x358 at x270, strip 640x64 at y378, drawn not scaled.
- End turn icon-only below a 240 px row; strip press = accent ground, bg ink, ring off, scale .92, 200 ms; day/night 320 ms clockwise, no overshoot; reduced motion drops motion, never the state change.
