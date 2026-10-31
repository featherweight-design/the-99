# Readiness: hide a commander

**Verdict: Green from Design.** Hugh approved every board on 2026-10-31 (R1c, option A for the row's glyph). The calls were drawn against `origin/main` @7bf3c89 and the places they touch were checked on `origin/main` @c245288. It needs **one migration**: a per-user hidden-commanders table, keyed on the commander's card (oracle id) and stamped with when it was hidden. Whether it ships behind a switch is engineering's call. Filtering the ranked lists could plausibly regress them, so a switch fits the repo's rule. DRAFT strings go through `/copy-review`. Engineering's own audit may move any item.

## For engineering, by area

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **Store and actions (M, lane commanders).** Add the table, plus `hide` / `unhide` server actions. Both are optimistic and idempotent. Hide acts on the card the row draws. A two-faced commander is one card. Partners are two cards. Hidden never applies to the public `/commander/[slug]` page.
2. **Lists leave hidden commanders out (M, lane commanders/discovery).**
   - For you and Discover drop hidden commanders where the pool is read. `src/lib/discovery/candidates.ts` already filters built commanders with `notBuiltBy`, and the hidden filter sits beside it.
   - `loadCommanderCounts` (`src/lib/commanders/counts.ts`) and the count lines leave them out.
   - Search on a list reports a hidden match through the shipped held state (`src/lib/commanders/excluded-report.ts`, `src/components/commanders/excluded-match.tsx`) with a new cause, *you hid it*, and an **Open its page** primary.
3. **Row control (S to M, lane commanders).** In `src/components/commanders/commander-row.tsx`, the glyph shares the `FitBar` wrapper's line.
   - Phone: the bar takes the rest of the line.
   - Desktop: the bar keeps its 520px and legend, and the glyph sits at the row's right edge.
   - The glyph is a 16px eye-slash in `--fg-faint`, with a 44px target and `z-[2]` above the stretched link. Its `aria-label` and `title` are *Hide {name}*.
   - Pressed, the row becomes the deck builder's shipped `UndoRow` (`src/components/decks/decklist-row.tsx`) reading *{name} hidden*. There is no toast or timer.
4. **Hidden tab (M, lane commanders).** Add a fourth tab to the Commanders `PlaceStrip`, `/commanders/hidden`, carrying the shipped `count`.
   - Rows reuse `src/components/intake/choose-row.tsx` with *Hidden {date}* and **Unhide**.
   - The empty state is the shared ZeroState.
   - Unhide turns the row into the Undo row, reading *back in For you* or *back in Discover*.
   - Four tabs fit 390 without compact spacing.
5. **Commander page (S to M, lane commanders).** `src/app/commanders/[slug]/page.tsx`:
   - Hidden: the hero's note shape with **Unhide**, the kicker *Hidden*, and *Not ranked while hidden*.
   - Not hidden: a quiet *Hide from my lists* line, under the hero on the phone and under the build note on desktop.
6. **Help me choose (S, lane commanders).** Candidates exclude hidden commanders before picks and ordering. Nothing is drawn. Past History runs drop the hidden row silently too.
7. **Failures (S).** Hide refused: the row returns, with the shared toast *We couldn't hide {name}. Try again.* Undo refused: the line under the row. Unhide refused: the shared toast. All three strings are DRAFT.

## Not built

- `Placement` board options B and C. They are the R1c record only.
