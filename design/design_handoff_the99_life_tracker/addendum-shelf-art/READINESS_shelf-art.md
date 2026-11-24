# Readiness Review: Life tracker, more commander art in the shelf (addendum, cold audit)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-23, against origin/main (cc89ad770)
**Related ticket(s):** PR #3267; extends `design_handoff_the99_life_tracker` (F06, F14, F16) and the tablet sheet addendum's `DamageArt`
**Plan PR target:** TBD (one PR, `src/components/tracker/sheet.tsx` plus its test)

## Summary

A small, buildable change. `scratch-gen/proposal.diff` applies against the current `DamageTab` phone path (its context lines match origin/main exactly) and reuses `ArtStrip`, `CARD_BOX` and `Stepper` as they are. No new tokens, copy keys, data or routes. Yellow only for four eng-side clarifications below; none needs Design. This is an independent audit; Design's own `READINESS.md` in the folder is left as written.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary is explicit: phone `DamageTab` only; `DamageArt` (tablet/desktop) and the other tabs unchanged; no copy changes. B chosen by Hugh, A kept for comparison only.

### 🎭 State coverage

- [✅] Boards cover 2, 3-end, 4-around and 6 players, upright and sideways seats, each shipped/A/B.
- [✅] Edge states named: count 0, partner deck, no art.
- [🟡] Not drawn: a partner pair on a phone, where each opponent card is about half the sheet width and the two steppers stack inside `min-h-[176px]`. See clarification 2.
- [🟡] Not drawn: five opponents (6 players) with `min-h-[176px]` cards, three rows. See clarification 3.

### 🔌 Data contract

- [✅] No new data. `artsOf`, `damageCommanders` (Background seat gives one hitter) and `cmdrName` already supply everything. A seat with `art: null` falls to `ArtStrip`'s `--elevated` fill.

### 🧱 Codebase fit

- [✅] `ArtStrip`, `CARD_BOX`, `Stepper` (`damage`/`damageOne`), `PersonName` and `copy.history.you` all exist as named. The diff mirrors `DamageArt` (same fade shape, 55/24/36/88 versus 55/26/40/86; same text shadow).
- [🟡] The phone card is a near copy of `DamageArt`'s card (fade, name over head, foot). The build should share the fade and name markup rather than add a second inline gradient; see clarification 4. The drawn values differ slightly, so the plan picks one.
- [✅] No em-dash or copy issue; no new strings.

### ♿ Cross-cutting

- [🟡] Contrast: disabled − (`disabled:opacity-40`) at count 0, and the commander name, sit over arbitrary art. Tablet already ships this treatment under a 86% foot fade, so the pattern is accepted. Check light art in the close-out contact sheet.
- [✅] Art stays `aria-hidden`; the stepper labels (`copy.sheet.fewer/more`) are unchanged, so the tests that read by role and name hold.
- [✅] Performance: same images, same `FadingImg`; the visible area grows but no new requests.

### ⏰ Drift from reality

- [✅] The names in the README (`DamageTab`, `ArtStrip`, `DamageArt`, `sheet.tsx`) all exist. `proposal.diff` context matches origin/main.
- [🟡] Overlap note only: the badge-fit build in `.worktrees/tracker-badge-fit` edits `panel.tsx`, `panel.test.tsx` and `copy/tracker.ts`. This addendum touches `sheet.tsx` only, so no textual conflict is expected. The badge "+N quick look" opens the sheet, so the two meet at runtime, not in code.

### 📝 Decision log

- [✅] B approved by Hugh 2026-11-24; the Q1 outcome and the rejected A are recorded.

## Eng-side clarifications (Yellow)

1. Do not add `data-testid="damage-card"` to the phone card: `sheet.test.tsx` asserts the phone path has none (`not.toContain('data-testid="damage-card"')`). Keep the diff's markup as is.
2. Partner on a phone: `min-h-[176px]` is a floor, not a fixed height, so two stacked steppers grow the card (about 190px or more). The `damage` stepper (about 136px wide) fits a half-width card. Plan follows the drawn partner edge state and verifies it on the phone contact sheet.
3. Six players: the sheet's tab panel is `overflow-y-auto`, so three rows of 176px+ scroll and nothing clips. Plan records this as accepted.
4. Share the fade and name-over-art pieces with `DamageArt` where it is cheap (a small shared constant), and keep the drawn phone gradient values. Do not alter the tablet's gradient.

## Decisions inherited

- B, art fills the card (Hugh, 2026-11-24).
- Tablet and desktop (`DamageArt`) unchanged; no copy changes; other tabs unchanged.
- `design/` is reference only: `scratch-gen/proposal.diff` is a draft and is never imported or shipped.
- Build touches: `src/components/tracker/sheet.tsx` (DamageTab phone path), and `src/components/tracker/sheet.test.tsx` only if a phone assertion is wanted. Mobile and desktop parity needs no second surface: desktop is drawn as a tablet.
