# Readiness — strategy focus

**Verdict: Green.** Approved by Hugh 2026-10-22 (R2g: the ring, the focus's icon larger on a medallion). Nothing below blocks the build.

## Ruled

1. One swap engine (Hugh, after R1): no paid strategy read and no lean-in tool. The free graph picks a focus; the shipped Suggested changes aims at it. The brief's lean-in result states (short, no candidates, cuts run out) go with it.
2. The graph is a ring with a legend; the legend row is the press, with a *Pick a focus* kicker and a radio per row. Desktop centres the ring and legend.
3. The centre is the focus's icon on a medallion; the legend uses the same icons. No focus: an empty dashed circle. The commander's art is not used (the page head already shows it).
4. The ring after changes counts every pending change since the last commit, from any source; `+N` / `−N`.
5. Suggested changes gains one manifest row, one lead sentence and a `focus` citation chip, nothing else. Its rows stay the shipped lines (ownership dot between the thumb and the name).
6. Empty states are one box each, with the copy in the README. Heading and sub are Hugh's words.

## For engineering

1. The axes and scores are on branch `strategy-axes` (`src/lib/strategy/axes.ts`); the ring draws the top five by score and shows copy COUNTS, never shares. Counts on the boards are fixtures.
2. Focus storage: one nullable axis key on the deck (a label theme, a type-line axis, or `typal:<Type>`), written only on a change. A focus whose axis falls out of the top five stays saved; eng decides whether the ring shows it as a sixth row or the line alone.
3. Suggested changes reads the focus as an input; a focus change counts as new input for the unchanged-state rule. The chip's figure is the axis count before → after the one addition.
4. "After changes" compares the working list with the last committed version; no new storage if versions already give that.
5. 35 icons are owed (README). Five are drawn; the rest are a design follow-up before the switch flips, or the build ships with the five and a neutral fallback glyph behind the switch.
6. About: `deck-focus` (`about · giving a deck a focus.ts`), in the launch-end batch's single `ABOUT_VERSION` bump; Suggested changes' entry gains one line. Recapture of the Analysis block with the switch on is owed.
7. A new switch for the feature in `src/lib/switches/registry.ts` (eng names it).

Every new string not marked as Hugh's is a placeholder for `/copy-review`.
