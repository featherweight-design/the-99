# READINESS — amendment 5, Shopping reads availability (#281)

`design/design_handoff_the99_amendments/` · R1 · 2026-09-05

## Verdict: 🟢 Green on all three open calls

| # | Call | Answer | Blocks |
|---|---|---|---|
| 1 | Does a "you own it, but not spare" card enter Shopping? | **Yes — and only the `over` state.** `soft` stays out, `hard` is unreachable on a deck's own list. | nothing |
| 2 | Same row, or a distinguished one? | **Same row, one word.** Green dot, #43's marker and over tint, `buy → 2nd copy`, in its own group pinned last. | nothing |
| 3 | Is the over-committed summary redundant? | **No — it is the index.** Every shipped word stays; the builder's band gains one link. The deck card gains nothing. | nothing |
| + | The knock-on: group-header arithmetic and the Shopping intro/footer counts | **No role-group arithmetic moves.** The list's counts move; the deck's caption does not. | nothing |

**Nothing in this amendment is waiting on a person.** The two items below are work, not decisions.

## Two items that are work, not calls

1. **The spent slot** (`decklist.tsx:139`). Removing a spoken-for card from the Shopping view
   currently leaves no undo row, because the condition tests `!spentSlot.owned`. It becomes the
   same predicate as the filter. One expression, same file, covered by a test in
   `decklist.test.ts`. **If this is skipped the amendment ships a silent data loss on a 44px
   target** — flagged here rather than in the gap list for that reason.
2. **The export dialog's Shopping tab.** Its heading (`8 cards you don't own`) and its copy
   payload are outside this folder's copy files. Design will draw the same split on request; until
   then the export under-reports by the contested count. Not a blocker for the in-app surface.

## What an audit should check first

- **The zero case is byte-identical.** With `spokenFor === 0`, the pill, intro, footer, every
  group header and every row must render exactly as they ship. One unit test asserts it; that
  assertion is what makes this amendment cheap.
- **`free` is read, never recomputed.** Any appearance of `owned − hard` in the new code is the
  defect Addendum 2 §6 / R5 §6 warns about, and it is silently wrong on the only surface this
  amendment touches.
- **`selfExcluded: true` is passed on every call.** Without it, every genuine hard claim from
  another deck would read as silence — and with it against an unexcluded figure, the reverse.
  `decklist-row.tsx:129` is the reference call site.
- **Disjointness is by guard, not by filter.** `owned <= 0 → free` runs first, so no card can be
  both unowned and contested. No de-duplication should appear anywhere.
- **Basics still cannot enter.** The basics exclusion runs before the availability test, as it
  does today.

## Carries forward

- Addendum 2 §6 and its R5 §1 correction are the load-bearing rule; R5 §6's warning is quoted at
  the top of the canvas because a formula in a hand-off gets copied.
- Amendment 3 (`Over`) and this amendment are independent and unordered. On an over-99 deck both
  render, neither mentions the other, and the compounding is logged as gap 7.
- Locked decision 2 (no roll-up, no badge on the deck index) is untouched.
- No new token, hue, glyph, motion, query, route or param. One optional prop on `BuyTag`, one
  optional callback on `RollupBands`.
