# The 99 — The Climb under an answered range (design handoff, addendum F, H34)

**Source of truth:** `docs/superpowers/design-briefs/2026-10-02-climb-declared-range.md` (main, #1186).
Read with it: `src/lib/bracket/climb.ts` (`climb`, :20–27), `src/components/decks/bracket-climb.tsx`
(`answered` :66, `Rung` :151–171, labels :196–202, `RungBody`), `src/lib/copy/deck-analysis.ts` (`climb.*`),
`src/lib/copy/declaration.ts` (:13, never quote the player), `src/lib/bracket/verdict-head.ts` (:55).

Files: `The 99 - Climb Declared Range.dc.html` (canvas: F1–F4 at 390 and 1300, then the states table Ft),
`STATES-climb-declared.md`, `climb-declared · copy strings.ts`, `READINESS.md`, `assets/`, `brand/`.

**Status:** reviewed with Hugh, 2026-10-03. Two rounds of copy cuts (see below).

**One line:** *the tinted rung follows the answer; the other bracket in the range reads `permitted`, and says nothing else.*

## The rule (both ranges, both answers)

The rungs drawn do not change: still `climb(permits)`. A 1/2 deck draws 1 and 2; a 4/5 deck draws 3, 4 and 5.
Once the range is answered (`declarationAsk(...).kind === "answered"`), only the two rungs **inside the range**
change role:

- **The declared bracket** takes the `yours` treatment: 12% ink tint, solid ink border, full mark 26 / 36, the
  allowances. Label: `declared`, both widths.
- **The other bracket in the range** takes a new role, `permitted`. No fill, a solid border at 40% of its
  bracket's ink mixed into `--border`, mark at 75% (chip 22 / full 26). Label: `permitted`, both widths.
  **No body.**
- **Rungs outside the range** (the 4/5 deck's rung 3) draw as today.

An unanswered range draws as today, including the 4/5 dashed declare rung.

## The calls

| # | Open item | Called |
|---|---|---|
| 1 | Which rung is yours | **It follows the answer.** The head names one bracket in its ink, so the one tinted rung has to be that bracket in that ink, or the page draws two answers. The cards' fact is kept: both rungs in the range carry the cards (the allowances on one, `permitted` on the other). |
| 2 | Answer is the higher bracket (1/2→2, 4/5→5) | The upper rung claims *this is the deck's bracket*, with its allowances. The lower rung claims only that the cards fit there as well, by its label alone. Neither says the deck uses less than it is allowed. |
| 3 | Answer is the lower bracket (1/2→1, 4/5→4) | **Today's drawing is not right for either range.** At 4/5, *It permits more than this deck uses* is false: 4 and 5 share every card limit. At 1/2 it is true but says nothing about the choice. The rung above gets the same `permitted` treatment, so the rule is symmetric. |
| 4 | Labels | `declared` and `permitted`. `declared` is the record word the head already ships (`Declared Core.`), so nothing quotes the player. On an answered range, `where your cards are` / `your cards` and `aboveAllowed` leave the in-range rungs. |
| 5 | Widths | `permitted` is 9 characters of 9px mono, about 60px, in the 186px column beside a 26px mark. At 390, the widest pair (Exhibition · permitted) is about 200 of 282px. One line, role at the far end. |

## Review rounds (Hugh, 2026-10-03)

1. The *Nothing to change.* opener cut from the in-range body, and the label renamed from `permitted too` to `permitted`.
2. The whole body line cut. The `permitted` rung is mark, name and label only.

## Notes for engineering

1. **`climb()` is unchanged.** Remap roles in `BracketClimb` when `answered`: for a rung with
   `permits.includes(bracket)`, the role is `declared` if `bracket === declared`, otherwise `permitted`.
   The 4/5-only `declares` branch keeps its unanswered meaning, and needs no second home.
2. **The declared rung's allowances read at the declared bracket.** `Allowances` already takes
   `bracket`, so 1/2→2 reads bracket 2's report, and 4/5→5 reads `no cap`. A 1/2 deck holds none of
   the four rules (that is why it is 1/2), so its declared rung has no body. That is the existing
   empty-cell rule, not a new state.
3. **`permitted` has no `RungBody`.** Render the label row only. Padding stays as the neighbour rungs'
   (`py-[10px]`).
4. **Border token:** `color-mix(in oklab, <ink> 40%, var(--border))`. It's an edge, not text. Check it
   against `--surface` on all six themes in build.
5. **Drift is out of scope.** An answer outside the range is not `answered`, so it draws as unanswered.

## Ledger

1. `permitted` and `declared` go to /copy-review in the build lane. The words here are placeholders.
2. The 40% border was not measured on the five other themes; only Amonkhet is drawn.
