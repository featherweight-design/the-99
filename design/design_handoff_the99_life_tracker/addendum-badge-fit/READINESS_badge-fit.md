# Readiness Review: Life tracker, every badge fits (addendum, R2)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-23 (cold read, against origin/main 79223cce0)
**Related ticket(s):** PR #3265; extends `design_handoff_the99_life_tracker` (F10, F12, F14, F18, F19, the sheet)
**Plan PR target:** TBD (one PR: `src/components/tracker/panel.tsx`, `src/lib/copy/tracker.ts`, `panel.test.tsx`, `whats-what.tsx` check)

## Summary

Ready to plan. The addendum is approved by Hugh (R2), every board is drawn (Main, Phone, Tablet, plus per-board zooms), and its code reference `scratch-gen/proposal.diff` applies cleanly (`-p0`) to current origin/main, which is the same commit the diff was cut against, so there is no drift. All data it needs already exists (damage per commander, counters, tax, monarch, initiative, COUNTER_KEYS, lethal constants 21 and 10). Eight eng-side clarifications for the plan PR, none of which needs Design.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Boundary clear: the badge row and the new quick look; chip taps still open the shipped sheet. Q1 and Q2 are both settled and recorded.
- 🟡 The addendum's own READINESS.md says "4 keys" for the copy change; `copy strings.ts` and the diff add 8 (`badgeFigure`, `badgeTaxFigure`, `badgeMore`, `badgeMoreAria`, `peekLabel`, `peekClose`, `peekTax`, `peekOf`). The plan uses 8.

### 🎭 State coverage

- ✅ `STATES.md` covers none, all fit, overflow, your turn, out, tap chip, tap +N, close, hover, re-fit and reduced motion. Phone and tablet (desktop is the tablet path) are drawn on every board in the 9-row table.
- ✅ No loading, error or signed-out state exists for this row; none is needed.
- 🟡 Undrawn corner: a seat's quick look when a neighbour is also open, or two seats pressing +N at once. The diff holds one `peek` per panel; the plan decides whether opening one closes the others (the outside-tap listener already closes it on any pointerdown, so the drawn pattern implies yes).

### 🔌 Data contract

- ✅ No schema or API change. Every chip maps to existing engine state: `seat.damage`, `seat.counters`, tax, monarch, initiative. Lethal ordering uses `COMMANDER_DAMAGE_LETHAL` (21) and `POISON_LETHAL` (10) from `lib/tracker/engine`.
- 🟡 "Ordered by nearness to lethal" with poison sharing the 10 threshold and damage the 21 threshold: ties and the poison-vs-damage tiebreak are not stated. Plan follows the diff's sort.

### 🧱 Codebase fit

- ✅ Same pill tokens as shipped; `--elevated` and accent ring already exist; copy goes in `trackerCopy.panel` and the existing `badge`, `badgeTax`, `badgeAria` stay as the aria-label. No em dashes in the new strings.
- 🟡 The diff is a working draft, not shipped code. Plan must re-run the repo's own checks on it (`check:third-party-names`: the damage chip draws another player's commander art and name only through the existing `personAttrs` path, which the diff keeps; the quick look must also draw names via `PersonName`/`PersonText`, not a bare string).
- 🟡 Tests: `panel.test.tsx` "draws a badge for each counter in play" reads visible text ("Poison 2"); the words move to aria-label and title. jsdom has no layout, so stub `clientWidth`/`offsetWidth` or assert on `data-total`.
- 🟡 `whats-what.tsx` targets `[data-testid="panel-badges"]` and tests `childElementCount > 0`; the row now holds an invisible ruler child. Still true whenever chips exist, but the plan re-checks the "badges" hole on phone boards because R2 moves the name to the outer edge and `panel-foot` now exists on every board.
- 🟡 Copy wording ("Every badge", "Close") goes through copy-review, not Design.

### ♿ Cross-cutting

- ✅ Full words stay in each chip's aria-label; ruler is `inert` + `aria-hidden`; +N carries `aria-expanded` and `badgeMoreAria`; the card is a labelled `region`; Escape, ✕ and outside tap close it; nothing animates, so reduced motion is moot.
- 🟡 Hit areas: chips 44 to 51 px wide via `after:inset-[-10px_-3px]`, matching shipped. Figure contrast on the new compact chips is not stated; the plan checks the figure text against the pill ground at 4.5:1 (recent #3191 and #3206 set this bar for ±N figures).
- ✅ Performance: ResizeObserver on the client panel only, no SSR path renders the row; re-fit is a recount without animation.

### ⏰ Drift from reality

- ✅ Cold check: base commit of the proposal equals current origin/main (79223cce0); `Panel`, `Badge`, `BadgeRow` anchors (`panel-badges` test id, `badgeAria`, `COUNTER_KEYS` order) exist as named. `foot`-board and ends-board anatomies described as "shipped" match the code.
- 🟡 Hugh's recent tracker PRs (#3187, #3191, #3206) touched `panel.tsx`; re-apply the diff by hand after any further rebase.

### 📝 Decision log

- ✅ Calls 1 to 5, R2 notes, and Q1/Q2 rulings are recorded; locked vs open is clear (nothing open).

## Gaps requiring a Design round-trip

None.

## Eng-side clarifications

- Item 1: The copy change is 8 keys, not 4.
- Item 2: One quick look open at a time (any outside pointerdown closes it), as the diff's listener implies.
- Item 3: Sort ties follow the diff: damage and poison first by fraction of lethal, then tax, then COUNTER_KEYS order, then monarch and initiative.
- Item 4: The quick look draws commander names through `PersonName`/`PersonText` so the third-party-name guard passes.
- Item 5: Update `panel.test.tsx` (stub layout widths) and confirm `whats-what.tsx`'s badges hole on phone boards after the anatomy change.
- Item 6: Confirm the quick look's `z-index: 40` lift clears the spine and the What's what scrim (the seat cell is a stacking context via `container-type: size`), and that no ancestor `overflow` clips it on the phone sideways boards.
- Item 7: Check figure contrast on compact chips against the pill ground (4.5:1).
- Item 8: Route "Every badge" and "Close" through copy-review.

## Decisions inherited

- Compact chips with full words in aria-label and title (Call 1); lethal-first order (Call 2); never cut a chip, show a +N (Call 3).
- R2: one anatomy on every board (name and deck on the outer edge, one controls row toward the strip); `foot` only picks the 52 px sizes.
- +N is a read-only quick look, not the sheet; the sheet button stays the way to change counts (Q1).
- End turn keeps its label (Q2 = A).
