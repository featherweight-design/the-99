# Readiness Review — Life tracker addendum: the player sheet on a tablet, and the coin toss

**Verdict:** 🟡 Yellow (buildable as drawn once Hugh approves the boards)
**Audited:** 2026-11-22, against origin/main 6aaf82a
**Related:** life tracker handoff (approved 2026-11-18) and its addenda; tablet and Menu addendum (#3115) for the turned layouts
**Plan PR target:** TBD (one tracker PR: sheet, damage cards, tab row, coin)

## Summary

Small and self-contained: four files, no schema, no new copy, no new switch. The whole change is
`scratch-gen/proposal.diff` (about 250 lines against `src/`), which is what the boards render, so the boards and the
diff agree by construction. Yellow only because the boards are not yet approved and because of three engineering notes
below (a test that pins the old coin class, the hint copy for partners, and End game inside the half sheet, which no board draws).

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Four calls, each with the devices it touches. Desktop is named as changing with the tablet (it already draws as one);
  the phone keeps its sheet and F06 cards and gets only the tab-row fix (no visible change) and the coin.
- ✅ Out of scope: new counters or tabs, copy, the phone sheet, the dice.

### 🎭 State coverage
- ✅ All five tabs at tablet landscape (D1, C1, X1, X2, X3), a sheet opened from the far side (D2), portrait (D5, C2),
  2 and 6 seats with a partner and a seat with no deck (D3, D4), a short-end seat (E1), desktop (D6), the coin's toss frames, shipped frames,
  phone, reduced motion and the landed state.
- ✅ A sheet from a short-end seat (E1, tablet 5 One at the end): 590 deep, 820 long, four cards stacked along it, the narrowest damage row of any layout.
- 🟡 Not drawn: End game's "How did it end?" inside the half sheet. The shipped grid (four across from 900 px) fits in
  the 285 px body at six seats (two rows of 64 px plus the back press).

### 🔌 Data contract
- ✅ None. Game state, engine and storage are untouched.

### 🧱 Codebase fit
- ✅ `Sheet` takes `tablet` (the surface already computes `device`); the half sheet, the veil and `DamageArt` branch on
  it. `DamageArt` reuses `ArtStrip`, `artsOf`, `cmdrName`, `Stepper` (`damageOne`, `tone="set"`) and `CARD_BOX`.
- ✅ Tab row: delete `(t === "table" ? "ml-auto " : "")`.
- ✅ Coin: `DiceRoll` takes `tablet` for the coin's size; new keyframes `coin-spin`, `coin-arc`, `coin-settle`,
  `coin-shadow`, `coin-land`, `sheet-up`, `sheet-veil` replace `coin-flip` and `dice-land` in `globals.css`.
  `.coin-face` stays (faces gain `translateZ` for the rim). `COIN_MS` stays 1150.
- 🟡 `dice-roll.test.tsx:49` asserts the old `animate-[coin-flip_1.15s…]` class; update it with the build.
- 🟡 The veil is a second Close button (`tabIndex={-1}`, `aria-label` = `copy.sheet.close`), the pattern the dice and
  Menu backdrops use; focus still lands on the ✕.
- 🟡 `scratch-gen/` is reference only: it bundles the shipped `PlaySurface` with stubs for `next/navigation`,
  `next/link` and the result actions. Never import it.

### ♿ Cross-cutting
- ✅ Reduced motion: every new animation is `motion-safe:`; the coin is drawn at rest and the result shows at once.
- ✅ Hit targets: shipped 44 px steppers and tabs. The count over the art keeps a text shadow and the foot scrim
  (0.86 black) behind white and accent text.
- 🟡 Copy: `damageHint` ends "A partner deck gets one card per commander." On a tablet a partner pair is one split card
  with a stepper under each half. Copy is unchanged by Hugh's brief; flagged in case he wants the line reworded later.

## Decisions inherited

- Calls 1 to 4 as drawn, pending Hugh's review of the boards. No new strings. No switch: ships with its build PR.
