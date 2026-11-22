# Readiness audit (cold read) — Life tracker addendum: What's what

**Verdict:** 🟡 Yellow (Design's READINESS says Green; its own findings are Yellow items, which the verdict should carry)
**Audited:** 2026-11-22, against origin/main 2c188e2 (`src/components/tracker/` unchanged vs the PR branch)
**Plan PR target:** one tracker PR (about 7 files, well under the split limit)

## Summary

Buildable as drawn. Every control the guide names exists on main and the guide's names match the shipped controls. No Design round-trip. The plan PR records the clarifications below as decisions.

## Controls named vs shipped

- ✅ Strip: `strip-round`, `strip-monarch`, `strip-initiative`, `strip-day`, `strip-dice`, `strip-undo`, `strip-menu` (spine.tsx). Round is a non-interactive circle; its label names it, fine.
- ✅ Panel: `half-minus`/`half-plus`, `end-turn` (active seat only, icon-only on phone), `panel-sheet`, `panel-badges` (rendered only when a badge exists, matching "when it has any badge").
- ✅ Copy facts hold: hold repeats 10 (HOLD_MS 480), commit after 2 s (COMMIT_MS), round rises when play crosses the first seat (engine), dice are d6/d20/coin, opening the Menu already closes dice, pick, sheet.
- 🟡 Names differ from aria: dice aria is "Roll dice or flip a coin", Menu aria "Menu"; guide names are visible labels only, so no conflict. Badge row also holds monarch/initiative/tax, and some badges are `role=img`, not tappable: "Tap one to change it" is true for only some (copy-review).
- ✅ Menu row: today only `strip-menu-back` (a Link, `role=menuitem`) takes open focus (spine.tsx ~L73); the build adds a button row above and moves that focus. No ? icon exists in icons.tsx; the build adds one (SunIcon/MoonIcon exist).
- ✅ Tokens exist: `--elevated`, `--border-strong`, `--motion-ease-out`, `--motion-exit-quick`; halo/bubble live in `components/moments/moment-bubble.tsx` (reuse the surface, do not import its placement).

## Per-dimension

### 🗺️ Scope clarity
- ✅ Calls, decisions and non-goals are explicit.
### 🎭 State coverage
- ✅ STATES.md covers first open, Menu, mid-game, flipped-out, storage unavailable; phone P1/P2 and tablet T1-T3 drawn; desktop classed tablet.
- 🟡 Layouts: 10 phone and 8 tablet layouts exist (`layouts.ts`); only `foot: true` tablets (2, 3-end, 3-side, 4, 5, 6 seats; not 4-around/5-end) have the foot panel the guide describes. On the four phone `*-sides` layouts cell 0 is rotated 90, so "your panel faces the foot" and "labels sit inside it" is unspecified. Decision for the plan: labels stay upright facing the foot, placed in the free space beside the rotated panel, leaders to its cutouts (strip pattern from call 6); check every layout at 390x844 and 1180x820.
### 🔌 Data contract
- ✅ Client only. Seen flag must not start with `the99.tracker.` (storage.ts `sweepGames` prefix); `the99.trackerGuide.seen` is safe. try/catch it.
### 🧱 Codebase fit
- 🟡 Trigger: the entry point is `onStart` in play-surface.tsx (also fires for Rematch, handled by the flag). First open = after `FirstRoll` `onDone` (or immediately when `rolls` is null, the I'll-pick path), +600 ms, none of sheet/dice/pick open. Resume loads a kept game and never reaches `onStart`, so it correctly shows nothing.
- 🟡 Spine's Esc listener and the Menu-close focus return (`moreButton.focus()`) both fire when What's what is pressed; the guide dialog must take focus after that.
- 🟡 Moments provider may deliver a bubble in the tracker; the guide should hold/close it as a landing halo does.
### ♿ Cross-cutting
- ✅ Dialog, inert board, reduced motion, contrast all specified.
### ⏰ Drift
- ✅ Nothing drifted; boards were rendered from the shipped tracker.
### 📝 Decision log
- ✅ Locked decisions recorded; copy is placeholder pending copy-review.

## Gaps requiring a Design round-trip

None.

## Eng-side clarifications

The four 🟡 items above (rotated cell-0 placement, trigger and focus order, seen-flag key, moments hold), plus copy-review of the badge line.

## Files the build touches

`src/components/tracker/whats-what.tsx` (new) and its test, `spine.tsx`, `play-surface.tsx`, `icons.tsx`, `src/lib/copy/tracker.ts`, `src/lib/tracker/storage.ts` (or a sibling for the flag), `layouts.ts` or a new placement table.
