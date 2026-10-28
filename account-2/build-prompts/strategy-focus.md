# Build prompt · Strategy focus (R2g)

Paste into Claude Code on your machine once PR #2226 is merged.

---

Build Strategy focus: a new block under Analysis, *The deck’s strategy*, draws the deck's top strategies as a ring and lets the player pick a free focus, and the shipped Suggested changes aims at that focus.

Start with `design/design_handoff_the99_strategy_focus/README.md`, then `READINESS.md` and `STATES-strategy-focus.md`. Open each `.dc.html` with `support.js` beside it. Work in a worktree under `.worktrees/`, as AGENTS.md says. Strings marked as Hugh's are final; every other new string is a placeholder for /copy-review.

The axes come from branch `strategy-axes` (`src/lib/strategy/axes.ts`, `pnpm measure:strategy`). Merge or rebase that first.

Plan it as separate PRs in this order, behind one new switch in `src/lib/switches/registry.ts` (name it; the About file uses `STRATEGY_FOCUS_ENABLED` as a placeholder):

1. **The read and the focus.**
   - Top five axes by score, showing copy counts and never shares.
   - One nullable focus key on the deck (a label theme, a type-line axis, or `typal:<Type>`), written only on a change.
   - A server action to set and clear the focus. Decide what happens when a focus falls out of the top five, and say so in the PR.
   - "After changes": compare the working list with the last committed version, from any source, as `+N` / `−N` per axis.
2. **The block on Analysis (Main, Focus-Flow 1 and 5, Graph-States, Ring-Centre boards).**
   - Placement: last in the reading, above Tuning.
   - Heading: *The deck’s strategy*. Sub: *The themes your deck is built around and how many cards support each strategy.*
   - **The ring:** one arc per strategy sized by count, with the focus arc pulled out in accent. Pending growth shows as a lighter accent arc.
   - **The centre:** the focus's icon on a medallion, using the R2g treatment on the Ring-Centre board. With no focus, an empty dashed circle.
   - **The legend:** a *Pick a focus* kicker, then one row per strategy with its icon, name, count (`11 +2 cards`) and a radio. Each row is a 44px press on the phone. The picked row is tinted.
   - **Layout:** the ring and legend sit centred side by side on desktop; on the phone they stack.
   - **The focus line:** *Keep it balanced* clears the focus.
   - **Empty states:** one box each, with the README's copy.
3. **Suggested changes reads the focus (Focus-Flow 2 to 4).**
   - The focus is an input to the run. A focus change counts as new input for the unchanged-state rule.
   - Additions lean toward the focus.
   - The panel gains one manifest row, *This deck's focus · Tokens*, and one lead sentence.
   - An addition toward the focus gets a `focus` citation chip (dashed accent) reading `Tokens 11 → 12`.
   - Nothing else in the panel changes. Rows stay the shipped lines, with the ownership dot between the thumb and the name.
4. **Icons.**
   - 35 are owed (README §Icons owed); five are drawn.
   - Ship the five plus a neutral fallback glyph behind the switch. Ask Design for the rest before the switch flips.
5. **About.**
   - Add `deck-focus` from `about · giving a deck a focus.ts` in the launch-end batch's single `ABOUT_VERSION` bump.
   - Add one line to Suggested changes' entry.
   - Recapture the Analysis block with the switch on, with a locator on the block.

Phone and desktop ship in the same PR. Each UI PR passes design-review.
