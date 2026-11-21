# Readiness Review — Life tracker addendum: Tablet 2 and 3, the tablet upright, the strip's Menu

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21
**Related ticket(s):** PR #3115 (addendum, branch `design/life-tracker-tablet-menu`); original handoff READINESS.md unchanged
**Plan PR target:** TBD (tracker layouts + Menu PR, audited against `origin/main`)

## Summary

Buildable as drawn, no schema change and no Design round. All three new layouts, and all five upright boards (V2 to V6), are
exactly `c(x, y, w, h, rot)` cells plus a spine rect; the `turned()` formula reproduces every V board cell and spine to the pixel
(checked V3, V4, V5, V6 against T-layouts and `tablet-4`/`tablet-5`/`tablet-6`). Copy matches the shipped labels and
`trackerCopy.strip` (`menu`, `back`), and has no em dashes or British spellings. The Yellow items are eng decisions the drawn
patterns settle: the counter-clockwise turn, popover direction against a top-edge strip, new icons, the pending-life flush, and
the undrawn phone-on-its-side. Next: the plan PR records each.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary, decisions (5, marked APPROVED by Hugh 2026-11-21) and "Out of this addendum" (mid-game layout change, rotate prompt, phone changes beyond the turned rule) are stated.
- [🟡] The phone on its side is pulled in by the "turned" rule (ADDENDUM, Upright bullet 2) but no board draws it. Resolve from the V boards: `turned(phone layout)` gives a row strip (e.g. `phone-2` spine 56x440 becomes 440x56, fits seven buttons at the row size).

### 🎭 State coverage

- [✅] Menu open on phone (M1-Menu-Phone) and tablet (M1-Menu-Tablet); 2 to 6 upright (V2 to V6); tablet 2 and 3 in both choices (T1 to T3). Reduced motion stated (0.2 s fade, none under reduced motion). Result hides the Menu. No empty or error state exists for a one-row menu.
- [🟡] M1 draws the popover above the button only where the strip is mid-canvas. T3 (Along one side) puts the strip on the top edge (y 10 to 74), so "above the button" is off-canvas (the board clips with `overflow-hidden`). Undrawn: popover below. Resolve from the clamp rule already given (8 px from the screen edges): open below when there is no room above. The shipped dice menu has the same limit in T3.
- [🟡] Phone-column Menu centring and the 8 px clamp are written but only drawn for the centred strip (`phone-3-side` strip at x 328 to 384 relies on the clamp).

### 🔌 Data contract

- [✅] No server field. Layout id is saved; turned is decided at draw time and never stored. A game saved earlier as `phone-2` on a tablet still resolves through `layoutById`.
- [🟡] `layoutsFor` fallback removal at `play-surface.tsx:245` is safe once all tablet counts 2 to 6 exist; `layouts.test.ts:29` currently excludes tablet 2 and 3 and must change in the same PR.
- [🟡] "Leaving commits any pending life delta first" is reachable: `pendingFrom` (a `Map<seat, () => number>`, `play-surface.tsx:76`) and `landLife` already settle pending deltas for the game-ending case (S5). The Menu link must call the same take-and-commit before navigating.

### 🧱 Codebase fit

- [✅] Geometry verified against `layouts.ts`: tablet-2 `(10,452,1160,358,0)`/`(10,10,1160,358,180)`, tablet-3-end and tablet-3-side tile the 1180x820 canvas with 10 px gutters, spines sit in the gap, order is clockwise from the bottom seat. `Spine` already switches on `rect.h > rect.w`, so the upright column needs no change. Stage uses `aspectRatio` + `100dvh`, so a turned canvas scales without change.
- [✅] Copy: `Back to the table` already exists (`copy.strip.back`); new line `The game stays on this {phone|tablet}. Back to the game picks it up.` is new copy for `/copy-review`; `Back to the game` matches `copy.resume`. Layout labels match the phone's.
- [🟡] Icons: `more` (⋯) and `door` are not in `icons.tsx` and not on I1/I2; the SVG paths are in M1 and the generator (`gen_tablet_menu.py` lines 28 and 29). Add `MoreIcon` and `DoorIcon` from those. The shipped Menu button is a text pill ("Menu", 11 px); the addendum replaces it with the icon and keeps `copy.strip.menu` as the accessible name.
- [🟡] Dice open state is local to `Spine` (`useState`); "only one popover at a time" needs it and the menu state coordinated with `pick` and `sheet` in `play-surface.tsx`.
- [✅] Device class from short side (`min >= 600`) replaces `(min-width: 768px)` at `play-surface.tsx:37 and 41`.

### ♿ Cross-cutting

- [✅] `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`/`menuitem`, Esc, outside tap, 64 px target. Popover is unrotated so it stays readable on any orientation.
- [🟡] Focus: move focus to the item on open and back to Menu on close (not stated; the dice menu does neither today). Follow the dice menu.

### ⏰ Drift from reality

- [✅] Files named exist (`layouts.ts`, `spine.tsx`, `play-surface.tsx`); the addendum correctly describes today's improvised bottom bar with Close (`play-surface.tsx:393-396`). Strip already holds six buttons plus Menu in code (spine height formula counts 9.04 buttons).
- [🟡] Locked boards F03/F12/F18/L1 to L5/P1 draw the strip with no Menu button. Not a conflict (the addendum adds one, M1 draws it), but design-review compares the strip to M1, not those boards.
- [🟡] Turned the other way: only the 90-degree formula is given. Derive the 270 case by symmetry: `{ x: y, y: canvas.w - (x + w), w: h, h: w, rot: rot - 90 }`, and probe `screen.orientation.angle` on a device to pin which angle takes which turn.

### 📝 Decision log

- [✅] Five decisions with rationale, status APPROVED; copy table marked final; engineering rules enumerated. No-confirm decision records why (nothing lost, S3 card).

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: Popover below the button when the strip is on the top edge (T3). Follows the clamp rule and the dice menu's sideways flip in a column.
- Item 2: Counter-clockwise turn formula and angle mapping (above), pinned by a probe on the real `screen.orientation`.
- Item 3: Add `MoreIcon`, `DoorIcon` from M1's SVGs; keep `copy.strip.menu` as the accessible name; drop `copy.strip.close`.
- Item 4: Flush pending life via `pendingFrom` before navigating; one popover at a time by lifting dice state.
- Item 5: Phone on its side uses `turned()` with no new board; record that no phone board exists for it.
- Item 6: Update `layouts.test.ts` (tablet 2 and 3 now exist) and remove the `play-surface.tsx:245` fallback; pin `turned()` with a test comparing V3 and V5.
- Item 7: Run `/copy-review` on the one new line before shipping.
- Item 8: About entry: not needed. About is image pages only at Hugh's discretion (`docs/agents/design-pipeline.md`); this addendum adds no launch and the README paragraph is the only doc.

## Decisions inherited

- Tablet 2 has one layout (Face to face); tablet 3 offers One at the end (default) and Along one side.
- Upright draws the landscape twin turned a quarter; no rotate prompt; seats stay on their edges; 0.2 s fade, none under reduced motion.
- Menu holds one row, Back to the table; no confirm; Close is removed; Menu hidden while the Result is up.
- Every earlier board stays locked; F12/F18 panel anatomy is reused unchanged.
